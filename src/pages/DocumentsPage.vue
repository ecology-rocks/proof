<template>
    <q-page class="q-pa-md">
        <div class="row items-center justify-between q-mb-md">
            <div class="text-h5">Documents</div>
            <q-btn label="New Document" color="primary" @click="openFormDialog()" />
        </div>

        <q-list bordered separator>
            <q-item v-for="doc in documents" :key="doc.id">
                <q-item-section>
                    <q-item-label>{{ doc.title }}</q-item-label>
                </q-item-section>
                <q-item-section side>
                    <div class="row">
                        <q-btn icon="edit" flat round color="grey" @click="openFormDialog(doc)" />
                        <q-btn icon="delete" flat round color="grey" @click="confirmDelete(doc)" />
                        <q-btn icon="arrow_forward" flat round color="grey" :to="`/document/${doc.id}`" />
                    </div>
                </q-item-section>
            </q-item>
        </q-list>

        <q-dialog v-model="isFormDialogOpen" persistent>
            <q-card style="min-width: 350px">
                <q-card-section>
                    <div class="text-h6">{{ formTitle }}</div>
                </q-card-section>

                <q-card-section class="q-pt-none">
                    <q-input dense v-model="formData.title" autofocus @keyup.enter="submitForm"
                        label="Document Title *" />
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
const documents = ref([]);
const isFormDialogOpen = ref(false);
const formData = ref({ title: '' });
const editingDocumentId = ref(null);

const formTitle = computed(() => editingDocumentId.value ? 'Edit Document Title' : 'New Document');

async function fetchDocuments() {
    const result = await window.db.getAllDocuments();
    if (result.success) {
        documents.value = result.documents;
    }
}

function openFormDialog(doc = null) {
    if (doc) {
        editingDocumentId.value = doc.id;
        formData.value.title = doc.title;
    } else {
        editingDocumentId.value = null;
        formData.value.title = '';
    }
    isFormDialogOpen.value = true;
}

async function submitForm() {
    if (!formData.value.title) return;

    let result;
    if (editingDocumentId.value) {
        result = await window.db.updateDocument({ id: editingDocumentId.value, title: formData.value.title });
    } else {
        result = await window.db.addDocument({ ...formData.value });
    }

    if (result.success) {
        isFormDialogOpen.value = false;
        $q.notify({ color: 'green-4', message: `Document ${editingDocumentId.value ? 'updated' : 'created'}`, icon: 'cloud_done' });
        await fetchDocuments();
    } else {
        $q.notify({ color: 'red-5', message: 'Failed to save document' });
    }
}

async function confirmDelete(doc) {
    $q.dialog({
        title: 'Confirm',
        message: `Are you sure you want to delete "${doc.title}"? This will also remove its links to any statements.`,
        cancel: true,
        persistent: true
    }).onOk(async () => {
        const result = await window.db.deleteDocument(doc.id);
        if (result.success) {
            $q.notify({ color: 'green-4', message: 'Document deleted', icon: 'cloud_done' });
            await fetchDocuments();
        } else {
            $q.notify({ color: 'red-5', message: 'Error: Could not delete document' });
        }
    });
}

onMounted(() => {
    fetchDocuments();
});
</script>