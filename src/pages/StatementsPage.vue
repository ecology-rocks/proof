<template>
  <q-page class="q-pa-md">
    <div class="row items-center justify-between q-mb-md">
      <div class="text-h5">Statements</div>
      <q-btn label="Add Statement" color="primary" @click="openFormDialog()" />
    </div>

    <div v-if="statements.length === 0" class="text-center text-grey q-mt-lg">
      No statements created yet.
    </div>
    <q-list v-else bordered separator>
      <q-item v-for="statement in statements" :key="statement.id">
        <q-item-section>
          <q-item-label>{{ statement.content }}</q-item-label>
        </q-item-section>

        <q-item-section side>
          <div class="row">
            <q-btn icon="edit" flat round color="grey" @click="openFormDialog(statement)" />
            <q-btn icon="delete" flat round color="grey" @click="confirmDelete(statement)" />
            <q-btn icon="arrow_forward" flat round color="grey" :to="`/statement/${statement.id}`" />
          </div>
        </q-item-section>
      </q-item>
    </q-list>

    <q-dialog v-model="isFormDialogOpen" persistent>
      <q-card style="min-width: 500px">
        <q-card-section>
          <div class="text-h6">{{ formTitle }}</div>
        </q-card-section>

        <q-card-section class="q-pt-none">
          <q-form @submit="submitForm">
            <q-input filled v-model="formData.content" label="Statement content *" type="textarea" autogrow lazy-rules
              :rules="[val => val && val.length > 0 || 'Please type something']" />
          </q-form>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="Cancel" v-close-popup />
          <q-btn flat label="Save" @click="submitForm" />
        </q-card-actions>
      </q-card>
    </q-dialog>

  </q-page>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useQuasar } from 'quasar';

const $q = useQuasar();
const statements = ref([]);
// --- Refactor Start ---
const isFormDialogOpen = ref(false);
const formData = ref({ content: '' });
const editingStatementId = ref(null); // Will hold the ID of the statement being edited

// A computed property to dynamically set the dialog title
const formTitle = computed(() => editingStatementId.value ? 'Edit Statement' : 'New Statement');

// --- Refactor End ---

async function fetchStatements() {
  const result = await window.db.getAllStatements();
  if (result.success) {
    statements.value = result.statements;
  } else {
    console.error("Failed to fetch statements:", result.error);
  }
}

// --- Refactor Start ---
// This one function now handles opening the dialog for both adding and editing
function openFormDialog(statement = null) {
  if (statement) {
    // Edit mode
    editingStatementId.value = statement.id;
    formData.value.content = statement.content;
  } else {
    // Add mode
    editingStatementId.value = null;
    formData.value.content = '';
  }
  isFormDialogOpen.value = true;
}

// This one function now handles submitting for both adding and editing
async function submitForm() {
  if (!formData.value.content) return;

  let result;
  if (editingStatementId.value) {
    // Update existing statement
    result = await window.db.updateStatement({
      id: editingStatementId.value,
      content: formData.value.content
    });
  } else {
    // Add new statement
    result = await window.db.addStatement({ ...formData.value });
  }

  if (result.success) {
    isFormDialogOpen.value = false;
    $q.notify({
      color: 'green-4',
      message: `Statement ${editingStatementId.value ? 'updated' : 'saved'}`,
      icon: 'cloud_done'
    });
    await fetchStatements();
  } else {
    console.error("Failed to save statement:", result.error);
    $q.notify({ color: 'red-5', message: 'Failed to save statement' });
  }
}
// --- Refactor End ---

async function confirmDelete(statement) {
  $q.dialog({
    title: 'Confirm',
    message: `Are you sure you want to delete this statement?`,
    cancel: true,
    persistent: true
  }).onOk(async () => {
    const result = await window.db.deleteStatement(statement.id);
    if (result.success) {
      $q.notify({ color: 'green-4', message: 'Statement deleted', icon: 'cloud_done' });
      await fetchStatements();
    } else {
      $q.notify({ color: 'red-5', message: 'Error: Could not delete statement' });
    }
  });
}

onMounted(() => {
  fetchStatements();
});
</script>