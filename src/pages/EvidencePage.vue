<template>
  <q-page class="q-pa-md">
    <div class="row items-center justify-between q-mb-md">
      <div class="text-h5">All Evidence</div>
    </div>

    <q-input v-model="searchTerm" label="Search evidence or source title..." outlined dense clearable class="q-mb-md">
      <template v-slot:append>
        <q-icon name="search" />
      </template>
    </q-input>

    <div v-if="!filteredEvidenceList.length" class="text-center text-grey q-mt-lg">
      No evidence found.
    </div>

    <q-list v-else bordered separator>
      <q-item v-for="item in filteredEvidenceList" :key="item.id">
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
          <div class="row">
            <q-btn icon="edit" flat round color="grey" @click="openEditDialog(item)" />
            <q-btn icon="delete" flat round color="grey" @click="confirmDeleteEvidence(item)" />
            <q-btn icon="arrow_forward" flat round color="grey" :to="`/evidence/${item.id}`" />
          </div>
        </q-item-section>
      </q-item>
    </q-list>

    <add-evidence-dialog v-model="isFormDialogOpen" :evidence-to-edit="editingEvidence"
      @form-submitted="fetchAllEvidence" />

  </q-page>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useQuasar } from 'quasar';
import AddEvidenceDialog from 'src/components/AddEvidenceDialog.vue'; // 1. Import the dialog

const $q = useQuasar();
const evidenceList = ref([]);
const searchTerm = ref('');

// --- Add these refs to manage the dialog ---
const isFormDialogOpen = ref(false);
const editingEvidence = ref(null);
// ---

const filteredEvidenceList = computed(() => {
  if (!searchTerm.value) {
    return evidenceList.value;
  }
  const lowerCaseSearch = searchTerm.value.toLowerCase();
  return evidenceList.value.filter(item => {
    const contentMatch = item.content.toLowerCase().includes(lowerCaseSearch);
    const titleMatch = item.referenceTitle.toLowerCase().includes(lowerCaseSearch);
    return contentMatch || titleMatch;
  });
});

async function fetchAllEvidence() {
  const result = await window.db.getAllEvidence();
  if (result.success) {
    evidenceList.value = result.evidence;
  }
}

// --- Add this function to open the dialog in edit mode ---
function openEditDialog(evidence) {
  editingEvidence.value = evidence;
  isFormDialogOpen.value = true;
}
// ---

async function confirmDeleteEvidence(evidence) {
  $q.dialog({
    title: 'Confirm',
    message: `Are you sure you want to delete this piece of evidence? This will also remove it from any statements it supports.`,
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
      await fetchAllEvidence();
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
  fetchAllEvidence();
});
</script>