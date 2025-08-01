<template>
  <q-page class="q-pa-md">
    <div class="row items-center justify-between q-mb-md">
      <div class="text-h5">All Evidence</div>
    </div>

    <div v-if="evidenceList.length === 0" class="text-center text-grey q-mt-lg">
      No evidence has been collected yet.
    </div>

    <q-list v-else bordered separator>
      <q-item v-for="item in evidenceList" :key="item.id">
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
import { ref, onMounted } from 'vue';
import { useQuasar } from 'quasar';

const $q = useQuasar();
const evidenceList = ref([]);

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