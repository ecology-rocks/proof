<template>
  <q-page class="q-pa-md">
    <q-btn flat round dense icon="arrow_back" @click="goBack" class="q-mb-md" aria-label="Back" />
    <div v-if="document">
      <div class="text-h4 q-mb-md">{{ document.title }}</div>
      <div class="text-body1 q-mb-md" v-if="document.content">{{ document.content }}</div>

      <q-separator class="q-my-md" />

      <div class="row items-center justify-between q-mb-md">
        <div class="text-h6">Statements</div>
        <q-btn label="Arrange Statements" color="primary" @click="isArrangeDialogOpen = true" />
      </div>

      <div v-if="linkedStatements.length === 0" class="text-center text-grey q-mt-lg">
        No statements have been added to this document.
      </div>

      <q-list v-else bordered separator>
        <q-item v-for="(statement, index) in linkedStatements" :key="statement.id">
          <q-item-section avatar>
            <q-avatar color="primary" text-color="white">{{ index + 1 }}</q-avatar>
          </q-item-section>
          <q-item-section>
            <q-item-label>{{ statement.content }}</q-item-label>
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
import ArrangeStatementsDialog from 'src/components/ArrangeStatementsDialog.vue';

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

onMounted(() => {
  fetchDetails();
});
</script>