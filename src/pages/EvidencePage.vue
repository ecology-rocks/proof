<template>
  <q-page class="q-pa-md">
    <div class="row items-center justify-between q-mb-md">
      <div class="text-h5">All Evidence</div>
    </div>

    <!-- Filter & Sort Bar -->
    <q-expansion-item expand-separator icon="tune" label="Filter & Sort" class="q-mb-md shadow-1 rounded-borders">
      <q-card>
        <q-card-section class="row q-col-gutter-md items-center">
          <!-- Text Search -->
          <q-input v-model="filters.searchTerm" label="Search evidence or source..." outlined dense clearable
            class="col-12 col-md-4" />
          <!-- Sort By -->
          <q-select v-model="filters.sortBy" :options="sortOptions" label="Sort By" emit-value map-options outlined
            dense class="col-12 col-md-2" />
          <!-- Filter by Tag -->
          <q-select v-model="filters.filterTagId" :options="tagOptions" label="Filter by Tag" emit-value map-options
            outlined dense clearable class="col-12 col-md-3" />
          <!-- Strength Filter -->
          <div class="col-6 col-md-3">
            <label class="q-mb-sm">Min Strength: {{ filters.minStrength }}</label>
            <q-slider v-model="filters.minStrength" :min="0" :max="5" label snap color="amber" />
          </div>
          <!-- Reliability Filter -->
          <div class="col-6 col-md-3">
            <label class="q-mb-sm">Min Reliability: {{ filters.minReliability }}</label>
            <q-slider v-model="filters.minReliability" :min="0" :max="5" label snap color="deep-purple" />
          </div>
        </q-card-section>
      </q-card>
    </q-expansion-item>


    <div v-if="isLoading" class="text-center q-mt-xl">
      <q-spinner-dots color="primary" size="40px" />
    </div>
    <div v-else-if="evidenceList.length === 0" class="text-center text-grey q-mt-lg">
      No evidence found matching your criteria.
    </div>

    <q-list v-else bordered separator>
      <!-- The list item structure remains the same -->
      <q-item v-for="item in evidenceList" :key="item.id">
        <q-item-section>
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
            <!-- Add this tag display block -->
            <div v-if="item.tags && item.tags.length" class="q-mt-sm q-gutter-xs">
              <q-chip v-for="tag in item.tags" :key="tag" dense outline color="grey-7" size="sm">
                {{ tag }}
              </q-chip>
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
import { ref, onMounted, watch, reactive } from 'vue';
import { useQuasar } from 'quasar';
import AddEvidenceDialog from 'src/components/AddEvidenceDialog.vue';

const $q = useQuasar();
const evidenceList = ref([]);
const isLoading = ref(true);
const isFormDialogOpen = ref(false);
const editingEvidence = ref(null);
const tagOptions = ref([]);

// All filter and sort states are now in a single reactive object
const filters = reactive({
  searchTerm: '',
  sortBy: 'newest',
  filterTagId: null,
  minStrength: 0,
  minReliability: 0,
});

const sortOptions = [
  { label: 'Newest First', value: 'newest' },
  { label: 'Oldest First', value: 'oldest' },
  { label: 'Highest Strength', value: 'strength' },
  { label: 'Highest Reliability', value: 'reliability' },
];

// This function now fetches data based on the current filters
async function fetchAllEvidence() {
  isLoading.value = true;
  const result = await window.db.getFilteredEvidence({ ...filters });
  if (result.success) {
    evidenceList.value = result.evidence;
  }
  isLoading.value = false;
}

// Watch for any changes in the filters object and refetch data
watch(filters, fetchAllEvidence, { deep: true });

async function fetchTags() {
  const result = await window.db.getAllTags();
  if (result.success) {
    // Format tags for the q-select component
    tagOptions.value = result.tags.map(tag => ({ label: tag.name, value: tag.id }));
  }
}

function openEditDialog(evidence) {
  editingEvidence.value = evidence;
  isFormDialogOpen.value = true;
}

async function confirmDeleteEvidence(evidence) {
  $q.dialog({
    title: 'Confirm',
    message: 'Are you sure you want to delete this piece of evidence?',
    cancel: true,
    persistent: true
  }).onOk(async () => {
    const result = await window.db.deleteEvidence(evidence.id);
    if (result.success) {
      $q.notify({ color: 'green-4', message: 'Evidence deleted' });
      await fetchAllEvidence();
    } else {
      $q.notify({ color: 'red-5', message: 'Error: Could not delete evidence' });
    }
  });
}

onMounted(() => {
  fetchAllEvidence();
  fetchTags();
});
</script>