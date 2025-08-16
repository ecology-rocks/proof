<template>
  <q-page class="q-pa-md">

    <div v-if="document">
      <q-btn flat round dense icon="arrow_back" @click="goBack" class="q-mb-md" aria-label="Back" />
      <div class="text-h4 q-mb-md">{{ document.title }}</div>
      <div class="text-subtitle1 text-grey-7 q-mb-md" v-if="document.excerpt">
        <div v-html="document.excerpt"></div>
      </div>
      <div class="text-body1 q-mb-md" v-if="document.content">
        <div v-html="document.content"></div>
      </div>

      <q-separator class="q-my-md" />

      <div class="row items-center justify-between q-mb-md">
        <div class="text-h6">Statements</div>
        <q-btn label="Arrange Statements" color="primary" @click="isArrangeDialogOpen = true" />
        <q-btn label="Export to Markdown" icon="download" color="secondary" @click="exportDocument" class="q-ml-sm" />
        <q-btn label="Export to DOCX" icon="description" color="primary" flat @click="exportAsDocx" class="q-ml-sm" />
        <q-btn label="Export to Share" icon="share" color="deep-purple" @click="exportForSharing" class="q-ml-sm" />
      </div>

      <div v-if="linkedStatements.length === 0" class="text-center text-grey q-mt-lg">
        No statements have been added to this document.
      </div>

      <q-list v-else bordered separator>
        <q-item v-for="(statement, index) in linkedStatements" :key="statement.id" clickable
          :to="`/statement/${statement.id}`">
          <q-item-section avatar>
            <q-avatar color="primary" text-color="white">{{ index + 1 }}</q-avatar>
          </q-item-section>
          <q-item-section>
            <q-item-label>{{ statement.content }}</q-item-label>
          </q-item-section>
          <!-- Add this button section -->
          <q-item-section side>
            <q-btn icon="arrow_forward" flat round color="grey" :to="`/statement/${statement.id}`" />
          </q-item-section>
        </q-item>
      </q-list>

    </div>
    <div v-else class="text-center">
      <q-spinner-dots color="primary" size="40px" />
    </div>

    <arrange-statements-dialog v-if="document" v-model="isArrangeDialogOpen" :document-id="document.id"
      :already-linked-statements="linkedStatements" @statements-arranged="fetchDetails" />
  </q-page>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useQuasar } from 'quasar';
import ArrangeStatementsDialog from 'src/components/ArrangeStatementsDialog.vue';

const $q = useQuasar();
const route = useRoute();
const router = useRouter();
const document = ref(null);
const linkedStatements = ref([]);
const isArrangeDialogOpen = ref(false); // State for our new dialog

function goBack() {
  router.back();
}

async function fetchDetails() {
  const documentId = parseInt(route.params.id, 10);
  if (isNaN(documentId)) return;

  const result = await window.db.getDocumentDetails(documentId);

  if (result.success) {
    document.value = result.document;
    linkedStatements.value = result.statements;
  }
}

async function exportDocument() {
  if (!document.value) return;

  const result = await window.db.exportDocumentAsMarkdown(document.value.id);

  if (result.success) {
    $q.notify({
      type: 'positive',
      message: `Document exported successfully to ${result.path}`,
      timeout: 5000 // Keep the message on screen a bit longer
    });
  } else if (!result.cancelled) {
    $q.notify({
      type: 'negative',
      message: 'An error occurred during export.'
    });
  }
}

async function exportForSharing() {
  if (!document.value) return;
  const result = await window.db.exportSharedDocument(document.value.id);
  if (result.success) {
    $q.notify({
      type: 'positive',
      message: `Document pack saved successfully to ${result.path}`,
      timeout: 5000
    });
  } else if (!result.cancelled) {
    $q.notify({ type: 'negative', message: 'An error occurred during export.' });
  }
}


async function exportAsDocx() {
  if (!document.value) return;
  $q.notify({ message: 'Generating DOCX file, please wait...', type: 'ongoing', timeout: 2000 });
  const result = await window.db.exportDocumentAsDocx(document.value.id);

  if (result.success) {
    $q.notify({
      type: 'positive',
      message: `Document exported successfully to ${result.path}`,
      timeout: 5000
    });
  } else if (!result.cancelled) {
    $q.notify({
      type: 'negative',
      message: 'An error occurred during export.'
    });
  }
}

onMounted(() => {
  fetchDetails();
});
</script>