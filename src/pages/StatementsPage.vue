<template>
  <q-page class="q-pa-md">
    <div class="row items-center justify-between q-mb-md">
      <div class="text-h5">Statements</div>
      <q-btn label="Add Statement" color="primary" @click="openFormDialog()" />
    </div>

    <!-- Filter & Sort Bar -->
    <q-expansion-item expand-separator icon="tune" label="Filter & Sort" class="q-mb-md shadow-1 rounded-borders">
      <q-card>
        <q-card-section class="row q-col-gutter-md items-center">
          <q-input v-model="filters.searchTerm" label="Search statements..." outlined dense clearable
            class="col-12 col-md-8" />
          <q-select v-model="filters.sortBy" :options="sortOptions" label="Sort By" emit-value map-options outlined
            dense class="col-12 col-md-4" />
        </q-card-section>
      </q-card>
    </q-expansion-item>

    <div v-if="isLoading" class="text-center q-mt-xl">
      <q-spinner-dots color="primary" size="40px" />
    </div>
    <div v-else-if="statements.length === 0" class="text-center text-grey q-mt-lg">
      No statements found matching your criteria.
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
import { ref, onMounted, computed, reactive, watch } from 'vue';
import { useQuasar } from 'quasar';

const $q = useQuasar();
const statements = ref([]);
const isLoading = ref(true);
const isFormDialogOpen = ref(false);
const formData = ref({ content: '' });
const editingStatementId = ref(null);

const filters = reactive({
  searchTerm: '',
  sortBy: 'newest',
});

const sortOptions = [
  { label: 'Newest Added', value: 'newest' },
  { label: 'Oldest Added', value: 'oldest' },
  { label: 'Content (A-Z)', value: 'content' },
];

const formTitle = computed(() => editingStatementId.value ? 'Edit Statement' : 'New Statement');

async function fetchStatements() {
  isLoading.value = true;
  const result = await window.db.getFilteredStatements({ ...filters });
  if (result.success) {
    statements.value = result.statements;
  }
  isLoading.value = false;
}

watch(filters, fetchStatements, { deep: true });

function openFormDialog(statement = null) {
  if (statement) {
    editingStatementId.value = statement.id;
    formData.value.content = statement.content;
  } else {
    editingStatementId.value = null;
    formData.value.content = '';
  }
  isFormDialogOpen.value = true;
}

async function submitForm() {
  if (!formData.value.content) return;
  let result;
  if (editingStatementId.value) {
    result = await window.db.updateStatement({ id: editingStatementId.value, content: formData.value.content });
  } else {
    result = await window.db.addStatement({ ...formData.value });
  }
  if (result.success) {
    isFormDialogOpen.value = false;
    $q.notify({ color: 'green-4', message: 'Statement saved' });
    await fetchStatements();
  } else {
    $q.notify({ color: 'red-5', message: 'Failed to save statement' });
  }
}

async function confirmDelete(statement) {
  $q.dialog({
    title: 'Confirm',
    message: 'Are you sure you want to delete this statement?',
    cancel: true,
    persistent: true
  }).onOk(async () => {
    const result = await window.db.deleteStatement(statement.id);
    if (result.success) {
      $q.notify({ color: 'green-4', message: 'Statement deleted' });
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