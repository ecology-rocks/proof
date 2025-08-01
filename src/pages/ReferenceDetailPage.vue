<template>
  <q-page class="q-pa-md">
    <div v-if="reference">
      <div class="text-h4">{{ reference.title }}</div>
      <div class="text-subtitle1 text-grey">{{ reference.author }} ({{ reference.year }})</div>

      <q-separator class="q-my-md" />

      <div class="row items-center justify-between q-mb-md">
        <div class="text-h6">Evidence</div>
        <q-btn label="Add Evidence" color="primary" @click="openEvidenceForm()" />
      </div>

      <div v-if="evidenceList.length === 0" class="text-center text-grey q-mt-lg">
        No evidence has been added for this reference.
      </div>
      <q-list v-else bordered separator>
        <q-item v-for="item in evidenceList" :key="item.id">
          <q-item-section>
            <q-item-label class="text-body1">"{{ item.content }}"</q-item-label>
            <q-item-label caption v-if="item.page_number">Page: {{ item.page_number }}</q-item-label>
          </q-item-section>

          <q-item-section side>
            <div class="row">
              <q-btn icon="edit" flat round color="grey" @click="openEvidenceForm(item)" />
              <q-btn icon="delete" flat round color="grey" @click="confirmDeleteEvidence(item)" />
            </div>
          </q-item-section>
        </q-item>
      </q-list>

    </div>
    <div v-else class="text-center">
      <q-spinner-dots color="primary" size="40px" />
      <p>Loading reference...</p>
    </div>

    <add-evidence-dialog v-if="reference" v-model="isEvidenceFormOpen" :reference-id="reference.id"
      :evidence-to-edit="editingEvidence" @form-submitted="fetchDetails" />
  </q-page>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { useQuasar } from 'quasar';
import AddEvidenceDialog from 'src/components/AddEvidenceDialog.vue';

const $q = useQuasar();
const route = useRoute();
const reference = ref(null);
const evidenceList = ref([]);
// --- Refactor Start ---
const isEvidenceFormOpen = ref(false);
const editingEvidence = ref(null); // Will hold the evidence being edited

async function fetchDetails() {
  const referenceId = parseInt(route.params.id, 10);
  if (isNaN(referenceId)) return;

  const result = await window.db.getReferenceDetails(referenceId);
  if (result.success) {
    reference.value = result.reference;
    evidenceList.value = result.evidence;
  }
}

// This function now handles opening the dialog for both modes
function openEvidenceForm(evidence = null) {
  editingEvidence.value = evidence;
  isEvidenceFormOpen.value = true;
}
// --- Refactor End ---

async function confirmDeleteEvidence(evidence) {
  $q.dialog({
    title: 'Confirm',
    message: `Are you sure you want to delete this piece of evidence?`,
    cancel: true,
    persistent: true
  }).onOk(async () => {
    const result = await window.db.deleteEvidence(evidence.id);
    if (result.success) {
      $q.notify({
        color: 'green-4',
        textColor: 'white',
        icon: 'cloud_done',
        message: 'Evidence deleted'
      });
      await fetchDetails();
    } else {
      $q.notify({
        color: 'red-5',
        textColor: 'white',
        icon: 'warning',
        message: 'Error: Could not delete evidence'
      });
    }
  });
}

onMounted(() => {
  fetchDetails();
});
</script>