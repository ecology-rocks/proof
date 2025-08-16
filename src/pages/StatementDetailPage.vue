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

      <!-- In StatementDetailPage.vue, replace your q-list with this -->
      <q-list v-else bordered separator>
        <q-item v-for="item in linkedEvidence" :key="item.id">
          <!-- This section is now a simple container -->
          <q-item-section>
            <!-- This inner div is now the clickable navigation area -->
            <div @click="$router.push(`/evidence/${item.id}`)" class="cursor-pointer">
              <q-item-label class="text-body1">
                <div v-html="item.content"></div>
              </q-item-label>
              <q-item-label caption>
                From: {{ item.referenceTitle }}
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
            </div>
          </q-item-section>

          <!-- This section is now completely separate from the navigation area -->
          <q-item-section side>
            <div class="row">
              <q-btn icon="edit" flat round color="grey" @click="openEvidenceForm(item)" />
              <q-btn icon="link_off" flat round color="grey" @click="confirmUnlink(item)" />
              <q-btn icon="arrow_forward" flat round color="grey" :to="`/evidence/${item.id}`" />
            </div>
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
    <!-- Add this dialog at the end of your template -->
    <add-evidence-dialog v-model="isEvidenceFormOpen" :evidence-to-edit="editingEvidence"
      @form-submitted="fetchDetails" />
  </q-page>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRoute } from 'vue-router';
import { useQuasar } from 'quasar';
import LinkEvidenceDialog from 'src/components/LinkEvidenceDialog.vue';
import AddEvidenceDialog from 'src/components/AddEvidenceDialog.vue'; // 1. Import the dialog

const $q = useQuasar();
const route = useRoute();
const statement = ref(null);
const linkedEvidence = ref([]);
const linkedDocuments = ref([]);
const isLinkDialogOpen = ref(false);

// --- Add this state for the edit dialog ---
const isEvidenceFormOpen = ref(false);
const editingEvidence = ref(null);
// ---

async function fetchDetails() {
  const statementId = parseInt(route.params.id, 10);
  if (isNaN(statementId)) return;

  const result = await window.db.getStatementDetails(statementId);

  if (result.success) {
    statement.value = result.statement;
    linkedEvidence.value = result.evidence;
    linkedDocuments.value = result.documents;
  }
}

// --- Add this function to open the edit dialog ---
function openEvidenceForm(evidence = null) {
  editingEvidence.value = evidence;
  isEvidenceFormOpen.value = true;
}
// ---

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