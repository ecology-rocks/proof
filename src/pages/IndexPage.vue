<template>
  <q-page class="q-pa-md">
    <div class="q-mb-md">
      <q-btn label="Add Reference" color="primary" @click="openFormDialog()" />
      <q-btn label="Import from BibTeX" icon="upload_file" color="secondary" @click="importFromBibtex"
        class="q-ml-sm" />
      <q-btn label="Refresh" color="secondary" @click="fetchReferences" class="q-ml-sm" />
    </div>

    <q-input v-model="searchTerm" label="Search by title or author..." outlined dense clearable class="q-mb-md">
      <template v-slot:append>
        <q-icon name="search" />
      </template>
    </q-input>

    <h5>References</h5>
    <div v-if="references.length === 0" class="text-grey">
      No references found. Add one to get started.
    </div>
    <q-list v-else bordered separator>
      <q-item v-for="ref in filteredReferences" :key="ref.id">
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
import { ref, onMounted, computed } from 'vue'; // 1. Import computed
import { useQuasar } from 'quasar';
import AddReferenceDialog from 'src/components/AddReferenceDialog.vue';

const $q = useQuasar();
const references = ref([]);
const isFormDialogOpen = ref(false);
const editingReference = ref(null);
const searchTerm = ref(''); // 2. Add a ref for the search term

// 3. Add a computed property to filter the references
const filteredReferences = computed(() => {
  if (!searchTerm.value) {
    return references.value;
  }
  const lowerCaseSearch = searchTerm.value.toLowerCase();
  return references.value.filter(ref => {
    const titleMatch = ref.title.toLowerCase().includes(lowerCaseSearch);
    const authorMatch = ref.author && ref.author.toLowerCase().includes(lowerCaseSearch);
    // Add this line to check the year
    const yearMatch = ref.year && String(ref.year).includes(searchTerm.value);

    return titleMatch || authorMatch || yearMatch;
  });
});

async function fetchReferences() {
  references.value = await window.db.getAllReferences();
}

async function importFromBibtex() {
  const result = await window.db.importFromBibtex();
  if (result.success) {
    $q.notify({
      type: 'positive',
      message: `${result.count} references imported successfully.`,
      icon: 'cloud_done'
    });
    await fetchReferences(); // Refresh the list
  } else if (!result.cancelled) {
    $q.notify({
      type: 'negative',
      message: 'An error occurred during import.'
    });
  }
}



function openFormDialog(reference = null) {
  editingReference.value = reference;
  isFormDialogOpen.value = true;
}

async function confirmDelete(reference) {
  $q.dialog({
    title: 'Confirm',
    message: `Are you sure you want to delete "${reference.title}"? This will also delete all of its associated evidence.`,
    cancel: true,
    persistent: true
  }).onOk(async () => {
    const result = await window.db.deleteReference(reference.id);
    if (result.success) {
      $q.notify({
        color: 'green-4',
        textColor: 'white',
        icon: 'cloud_done',
        message: 'Reference deleted'
      });
      await fetchReferences();
    } else {
      $q.notify({
        color: 'red-5',
        textColor: 'white',
        icon: 'warning',
        message: 'Error: Could not delete reference'
      });
    }
  });
}

onMounted(() => {
  fetchReferences();
});
</script>