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


    <div v-if="evidenceList.length === 0" class="text-center text-grey q-mt-lg">
      No evidence has been collected yet.
    </div>

    <q-list v-else bordered separator>
      <q-item v-for="item in filteredEvidenceList" :key="item.id">
        <q-item-section>
          <q-item-label class="text-body1">"{{ item.content }}"</q-item-label>
          <q-item-label caption>
            From: {{ item.referenceTitle }}
            <span v-if="item.page_number"> (p. {{ item.page_number }})</span>
          </q-item-label>
        </q-item-section>
        <q-item-section side>
          <q-btn icon="delete" flat round color="grey" @click="confirmDeleteEvidence(item)" />
        </q-item-section>
      </q-item>
    </q-list>

  </q-page>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'; // 1. Import computed
import { useQuasar } from 'quasar';

const $q = useQuasar();
const evidenceList = ref([]);
const searchTerm = ref(''); // 2. Add a ref for the search term

// 3. Add a computed property to filter the evidence
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
      await fetchAllEvidence(); // Refresh the list
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