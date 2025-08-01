<template>
  <q-page class="q-pa-md">
    <div v-if="statement">
      <div class="text-h5 q-mb-md">{{ statement.content }}</div>

      <q-separator class="q-my-md" />

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
            <q-item-label class="text-body1">"{{ item.content }}"</q-item-label>
            <q-item-label caption v-if="item.page_number">Page: {{ item.page_number }}</q-item-label>
          </q-item-section>

          <q-item-section side>
            <q-btn icon="link_off" flat round color="grey" @click="confirmUnlink(item)" />
          </q-item-section>
        </q-item>
      </q-list>

    </div>
    <link-evidence-dialog v-if="statement" v-model="isLinkDialogOpen" :statement-id="statement.id"
      :already-linked-ids="linkedEvidenceIds" @evidence-linked="fetchDetails" />
    <div v-else class="text-center">
      <q-spinner-dots color="primary" size="40px" />
      <p>Loading statement...</p>
    </div>
  </q-page>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'; // 1. Add computed
import { useRoute } from 'vue-router';
import { useQuasar } from 'quasar';
import LinkEvidenceDialog from 'src/components/LinkEvidenceDialog.vue';

const $q = useQuasar();
const route = useRoute();
const statement = ref(null);
const linkedEvidence = ref([]);
const isLinkDialogOpen = ref(false); // 3. Add state for the dialog

async function fetchDetails() {
  const statementId = parseInt(route.params.id, 10);
  if (isNaN(statementId)) return;

  const result = await window.db.getStatementDetails(statementId);

  if (result.success) {
    statement.value = result.statement;
    linkedEvidence.value = result.evidence;
  }
}

// 4. This function now opens the dialog
function linkEvidence() {
  isLinkDialogOpen.value = true;
}



// 3. Add the new unlink function
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
      await fetchDetails(); // Refresh the list
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