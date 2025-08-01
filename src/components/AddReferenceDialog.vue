<template>
    <q-dialog :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)" persistent>
        <q-card style="min-width: 400px">
            <q-card-section>
                <div class="text-h6">{{ formTitle }}</div>
            </q-card-section>

            <q-card-section class="q-pt-none">
                <q-form @submit="submitForm" class="q-gutter-md">
                    <q-input filled v-model="formData.title" label="Title *" lazy-rules
                        :rules="[val => val && val.length > 0 || 'Please type something']" />
                    <q-input filled v-model="formData.author" label="Author" />
                    <q-input filled type="number" v-model.number="formData.year" label="Year" />
                </q-form>
            </q-card-section>

            <q-card-actions align="right" class="text-primary">
                <q-btn flat label="Cancel" @click="$emit('update:modelValue', false)" />
                <q-btn flat label="Save" @click="submitForm" />
            </q-card-actions>
        </q-card>
    </q-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue';

// --- Refactor Start ---
const props = defineProps({
    modelValue: Boolean,
    referenceToEdit: {
        type: Object,
        default: null
    }
});

const emit = defineEmits(['update:modelValue', 'form-submitted']);

const formData = ref({
    title: '',
    author: '',
    year: null,
});

const formTitle = computed(() => props.referenceToEdit ? 'Edit Reference' : 'New Reference');

// Watch for the dialog opening and pre-fill form if editing
watch(() => props.modelValue, (isNowVisible) => {
    if (isNowVisible) {
        if (props.referenceToEdit) {
            // Edit mode: copy data from prop
            formData.value = { ...props.referenceToEdit };
        } else {
            // Add mode: reset form
            formData.value = { title: '', author: '', year: null };
        }
    }
});

async function submitForm() {
    if (!formData.value.title) return;

    let result;
    if (props.referenceToEdit) {
        // Update existing reference
        result = await window.db.updateReference({ ...formData.value });
    } else {
        // Add new reference
        result = await window.db.addReference({ ...formData.value });
    }

    if (result.success) {
        emit('form-submitted');
        emit('update:modelValue', false);
    } else {
        console.error('Failed to save reference:', result.error);
    }
}
// --- Refactor End ---
</script>