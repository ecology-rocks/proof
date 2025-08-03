<template>
  <q-page class="q-pa-md">
    <q-btn flat round dense icon="arrow_back" @click="goBack" class="q-mb-md" aria-label="Back" />
    <div v-if="statement">
      <div class="text-h5 q-mb-md">{{ statement.content }}</div>

      <q-separator class="q-my-xl" />

      <div class="row items-center justify-between q-mb-md">
        <div class="text-h6">Supporting Evidence</div>
        <q-btn label="Link Evidence" color="primary" @click="linkEvidence" />
      </div>

      <div v-if="linkedEvidence.length === 0" class="text-center text-grey q-mt-lg">
        No evidence has been linked to this statement.
      </div>

      <q-list v-else bordered separator>
        <q-item v-for="item in linkedEvidence" :key="item.id">
          <q-item-section>
            <q-item-label class="text-body1">
              <div v-html="item.content"></div>
            </q-item-label>

            <q-item-label caption>
              From: {{ item.referenceTitle || (reference && reference.title) }}
              <span v-if="item.page_number"> (p. {{ item.page_number }})</span>
            </q-item-label>

            <div class="row items-center q-mt-xs">
              <div class="row items-center no-wrap">
                <span class="text-caption text-grey-7 q-mr-xs">Strength:</span>
                <q-rating :model-value="item.rating_strength" size="xs" color="amber" icon="star" readonly />
              </div>
              <div class="row items-center no-wrap q-ml-md">
                <span class="text-caption text-grey-7 q-mr-xs">Reliability:</span>
                <q-rating :model-value="item.rating_reliability" size="xs" color="deep-purple" icon="verified_user"
                  readonly />
              </div>
            </div>
          </q-item-section>
          <q-item-section side>
            <q-btn icon="link_off" flat round color="grey" @click="confirmUnlink(item)" />
          </q-item-section>
        </q-item>
      </q-list>

      <q-separator class="q-my-xl" />

      <div v-if="linkedDocuments.length > 0">
        <div class="text-h6">Used in Documents</div>
        <q-list bordered separator dense>
          <q-item v-for="doc in linkedDocuments" :key="doc.id" clickable :to="`/document/${doc.id}`">
            <q-item-section avatar>
              <q-icon name="article" color="grey" />
            </q-item-section>
            <q-item-section>
              {{ doc.title }}
            </q-item-section>
            <q-item-section side>
              <q-icon name="arrow_forward_ios" color="grey" size="xs" />
            </q-item-section>
          </q-item>
        </q-list>
      </div>

    </div>
    <div v-else class="text-center">
      <q-spinner-dots color="primary" size="40px" />
      <p>Loading statement...</p>
    </div>

    <link-evidence-dialog v-if="statement" v-model="isLinkDialogOpen" :statement-id="statement.id"
      :already-linked-ids="linkedEvidenceIds" @evidence-linked="fetchDetails" />
  </q-page>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useQuasar } from 'quasar';
import LinkEvidenceDialog from 'src/components/LinkEvidenceDialog.vue';

const $q = useQuasar();
const route = useRoute();
const router = useRouter();
const statement = ref(null);
const linkedEvidence = ref([]);
const linkedDocuments = ref([]); // 1. Add a ref for the documents
const isLinkDialogOpen = ref(false);

function goBack() {
  router.back();
}

async function fetchDetails() {
  const statementId = parseInt(route.params.id, 10);
  if (isNaN(statementId)) return;

  const result = await window.db.getStatementDetails(statementId);

  if (result.success) {
    statement.value = result.statement;
    linkedEvidence.value = result.evidence;
    linkedDocuments.value = result.documents; // 2. Store the documents
  }
}

// ... (the rest of the script block remains the same) ...

function linkEvidence() {
  isLinkDialogOpen.value = true;
}

async function confirmUnlink(evidence) {
  $q.dialog({
    title: 'Confirm Unlink',
    message: `Are you sure you want to remove the link to this piece of evidence? The evidence itself will not be deleted.`,
    cancel: true,
    persistent: true
  }).onOk(async () => {
    const result = await window.db.unlinkEvidenceFromStatement({
      statementId: statement.value.id,
      evidenceId: evidence.id
    });

    if (result.success) {
      $q.notify({
        color: 'green-4',
        textColor: 'white',
        icon: 'cloud_done',
        message: 'Evidence unlinked'
      });
      await fetchDetails();
    } else {
      $q.notify({
        color: 'red-5',
        textColor: 'white',
        icon: 'warning',
        message: 'Error: Could not unlink evidence'
      });
    }
  });
}

const linkedEvidenceIds = computed(() => {
  return linkedEvidence.value.map(item => item.id);
});

onMounted(() => {
  fetchDetails();
});
</script>