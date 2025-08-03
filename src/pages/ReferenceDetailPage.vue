<template>
  <q-page class="q-pa-md">
    <q-btn flat round dense icon="arrow_back" @click="goBack" class="q-mb-md" aria-label="Back" />

    <div v-if="reference">
      <div class="text-h4">{{ reference.title }}</div>
      <q-btn label="Edit" icon="edit" flat @click="openFormDialog" />
      <div class="text-subtitle1 text-grey">{{ reference.author }} ({{ reference.year }})</div>


      <q-card flat bordered class="q-my-md">
        <q-card-section>
          <div class="text-h6">Details</div>
        </q-card-section>
        <q-separator />
        <q-card-section class="q-gutter-sm">
          <div v-if="reference.entry_type"><strong>Type:</strong> {{ reference.entry_type }}</div>
          <div v-if="reference.publisher"><strong>Publisher:</strong> {{ reference.publisher }}</div>
          <div v-if="reference.journal"><strong>Journal:</strong> {{ reference.journal }}</div>
          <div v-if="reference.volume"><strong>Volume:</strong> {{ reference.volume }}</div>
          <div v-if="reference.pages"><strong>Pages:</strong> {{ reference.pages }}</div>
          <div v-if="reference.doi"><strong>DOI:</strong> {{ reference.doi }}</div>
          <div v-if="reference.url"><strong>URL:</strong> <a :href="reference.url" target="_blank">{{ reference.url
          }}</a></div>
          <div v-if="reference.notes" class="q-mt-md">
            <strong>Abstract / Notes:</strong>
            <div class="text-body2" style="white-space: pre-wrap;">
              <div v-html="reference.notes"></div>
            </div>
          </div>
        </q-card-section>
      </q-card>

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
    <add-reference-dialog v-model="isFormDialogOpen" :reference-to-edit="editingReference"
      @form-submitted="fetchDetails" />
  </q-page>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useQuasar } from 'quasar';
import AddReferenceDialog from 'src/components/AddReferenceDialog.vue';
import AddEvidenceDialog from 'src/components/AddEvidenceDialog.vue';

const router = useRouter();
const $q = useQuasar();
const route = useRoute();
const reference = ref(null);
const evidenceList = ref([]);
const isFormDialogOpen = ref(false);
const editingReference = ref(null);
const isEvidenceFormOpen = ref(false);
const editingEvidence = ref(null);

function goBack() {
  router.back();
}

async function fetchDetails() {
  const referenceId = parseInt(route.params.id, 10);
  if (isNaN(referenceId)) return;

  const result = await window.db.getReferenceDetails(referenceId);
  if (result.success) {
    reference.value = result.reference;
    evidenceList.value = result.evidence;
  }
}

function openFormDialog() {
  editingReference.value = reference.value;
  isFormDialogOpen.value = true;
}

function openEvidenceForm(evidence = null) {
  editingEvidence.value = evidence;
  isEvidenceFormOpen.value = true;
}

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