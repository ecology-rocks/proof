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
            <q-card style="min-width: 600px; max-width: 70vw;">
                <q-card-section>
                    <div class="text-h6">{{ formTitle }}</div>
                </q-card-section>

                <q-card-section class="q-pt-none q-gutter-md">
                    <q-input dense v-model="formData.title" autofocus label="Document Title *" />

                    <div>
                        <div class="q-mb-sm text-grey-8">Excerpt</div>
                        <q-editor v-model="formData.excerpt" min-height="5rem"
                            :toolbar="[['bold', 'italic', 'underline']]" />
                    </div>

                    <div>
                        <div class="q-mb-sm text-grey-8">Main Content</div>
                        <q-editor v-model="formData.content" min-height="10rem" :toolbar="[
                            ['bold', 'italic', 'strike', 'underline'],
                            ['unordered', 'ordered'],
                            ['viewsource']
                        ]" />
                    </div>
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
// Add excerpt to the form data
const formData = ref({ title: '', excerpt: '', content: '' });
const editingDocumentId = ref(null);

const formTitle = computed(() => editingDocumentId.value ? 'Edit Document' : 'New Document');

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
        formData.value.excerpt = doc.excerpt; // Populate excerpt for editing
        formData.value.content = doc.content; // Ensure content is set for editing
    } else {
        editingDocumentId.value = null;
        formData.value.title = '';
        formData.value.excerpt = ''; // Reset excerpt
        formData.value.content = ''; // Reset content
    }
    isFormDialogOpen.value = true;
}

async function submitForm() {
    if (!formData.value.title) return;

    let result;
    if (editingDocumentId.value) {
        // Pass the excerpt when updating
        result = await window.db.updateDocument({ id: editingDocumentId.value, ...formData.value });
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

// ... (confirmDelete function remains the same) ...
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