<template>
  <q-page class="q-pa-md">
    <div class="row items-center justify-between q-mb-md">
      <div class="text-h5">References</div>
      <div>
        <q-btn label="Import from BibTeX" icon="upload_file" color="secondary" @click="importFromBibtex" />
        <q-btn label="Add Reference" color="primary" @click="openFormDialog()" class="q-ml-sm" />
      </div>
    </div>

    <!-- Filter & Sort Bar -->
    <q-expansion-item expand-separator icon="tune" label="Filter & Sort" class="q-mb-md shadow-1 rounded-borders">
      <q-card>
        <q-card-section class="row q-col-gutter-md items-center">
          <q-input v-model="filters.searchTerm" label="Search by title, author, or notes..." outlined dense clearable
            class="col-12 col-md-6" />
          <q-select v-model="filters.sortBy" :options="sortOptions" label="Sort By" emit-value map-options outlined
            dense class="col-12 col-md-3" />
          <q-input v-model="filters.filterType" label="Filter by Entry Type (e.g., book)" outlined dense clearable
            class="col-12 col-md-3" />
        </q-card-section>
      </q-card>
    </q-expansion-item>

    <div v-if="isLoading" class="text-center q-mt-xl">
      <q-spinner-dots color="primary" size="40px" />
    </div>
    <div v-else-if="references.length === 0" class="text-center text-grey q-mt-lg">
      No references found matching your criteria.
    </div>

    <q-list v-else bordered separator>
      <q-item v-for="ref in references" :key="ref.id">
        <q-item-section>
          <q-item-label>{{ ref.title }}</q-item-label>
          <q-item-label caption>{{ ref.author }} ({{ ref.year }})</q-item-label>
        </q-item-section>
        <q-item-section side>
          <div class="row">
            <q-btn icon="edit" flat round color="grey" @click="openFormDialog(ref)" />
            <q-btn icon="delete" flat round color="grey" @click.stop="confirmDelete(ref)" />
            <q-btn icon="arrow_forward" flat round color="grey" :to="`/reference/${ref.id}`" />
          </div>
        </q-item-section>
      </q-item>
    </q-list>

    <add-reference-dialog v-model="isFormDialogOpen" :reference-to-edit="editingReference"
      @form-submitted="fetchReferences" />
  </q-page>
</template>

<script setup>
import { ref, onMounted, reactive, watch } from 'vue';
import { useQuasar } from 'quasar';
import AddReferenceDialog from 'src/components/AddReferenceDialog.vue';

const $q = useQuasar();
const references = ref([]);
const isLoading = ref(true);
const isFormDialogOpen = ref(false);
const editingReference = ref(null);

const filters = reactive({
  searchTerm: '',
  sortBy: 'newest',
  filterType: '',
});

const sortOptions = [
  { label: 'Newest Added', value: 'newest' },
  { label: 'Year (Newest First)', value: 'year_desc' },
  { label: 'Year (Oldest First)', value: 'year_asc' },
  { label: 'Title (A-Z)', value: 'title' },
];

async function fetchReferences() {
  isLoading.value = true;
  const result = await window.db.getFilteredReferences({ ...filters });
  if (result.success) {
    references.value = result.references;
  }
  isLoading.value = false;
}

watch(filters, fetchReferences, { deep: true });

function openFormDialog(reference = null) {
  editingReference.value = reference;
  isFormDialogOpen.value = true;
}

async function confirmDelete(reference) {
  $q.dialog({
    title: 'Confirm',
    message: `Are you sure you want to delete "${reference.title}"?`,
    cancel: true,
    persistent: true
  }).onOk(async () => {
    const result = await window.db.deleteReference(reference.id);
    if (result.success) {
      $q.notify({ color: 'green-4', message: 'Reference deleted' });
      await fetchReferences();
    } else {
      $q.notify({ color: 'red-5', message: 'Error: Could not delete reference' });
    }
  });
}

async function importFromBibtex() {
  const result = await window.db.importFromBibtex();
  if (result.success) {
    $q.notify({ type: 'positive', message: `${result.count} references imported.` });
    await fetchReferences();
  } else if (!result.cancelled) {
    $q.notify({ type: 'negative', message: 'An error occurred during import.' });
  }
}

onMounted(() => {
  fetchReferences();
});
</script>