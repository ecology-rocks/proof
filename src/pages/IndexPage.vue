<template>
  <q-page class="q-pa-md">
    <div class="q-mb-md">
      <q-btn label="Add Reference" color="primary" @click="openFormDialog()" />
      <q-btn label="Refresh" color="secondary" @click="fetchReferences" class="q-ml-sm" />
    </div>

    <h5>References</h5>
    <div v-if="references.length === 0" class="text-grey">
      No references found. Add one to get started.
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
import { ref, onMounted } from 'vue';
import { useQuasar } from 'quasar';
import AddReferenceDialog from 'src/components/AddReferenceDialog.vue';

const $q = useQuasar();
const references = ref([]);
// --- Refactor Start ---
const isFormDialogOpen = ref(false);
const editingReference = ref(null); // Will hold the reference being edited

async function fetchReferences() {
  references.value = await window.db.getAllReferences();
}

// This function now handles opening the dialog for both modes
function openFormDialog(reference = null) {
  editingReference.value = reference;
  isFormDialogOpen.value = true;
}
// --- Refactor End ---

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