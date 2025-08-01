<template>
    <q-dialog :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)" persistent>
        <q-card style="min-width: 500px">
            <q-card-section>
                <div class="text-h6">{{ formTitle }}</div>
            </q-card-section>

            <q-card-section class="q-pt-none">
                <q-form @submit="submitForm" class="q-gutter-md">
                    <q-input filled v-model="formData.content" label="Quote or Snippet *" type="textarea" autogrow
                        lazy-rules :rules="[val => val && val.length > 0 || 'Please type something']" />
                    <q-input filled v-model="formData.page_number" label="Page Number" />
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

const props = defineProps({
    modelValue: Boolean,
    referenceId: Number,
    evidenceToEdit: {
        type: Object,
        default: null
    }
});

const emit = defineEmits(['update:modelValue', 'form-submitted']);

const formData = ref({
    content: '',
    page_number: '',
});

const formTitle = computed(() => props.evidenceToEdit ? 'Edit Evidence' : 'New Evidence');

watch(() => props.modelValue, (isNowVisible) => {
    if (isNowVisible) {
        if (props.evidenceToEdit) {
            formData.value = { ...props.evidenceToEdit };
        } else {
            formData.value = { content: '', page_number: '' };
        }
    }
});

async function submitForm() {
    if (!formData.value.content) return;

    let result;
    if (props.evidenceToEdit) {
        // Update existing evidence
        result = await window.db.updateEvidence({ ...formData.value });
    } else {
        // Add new evidence
        const dataToSave = {
            ...formData.value,
            reference_id: props.referenceId,
        };
        result = await window.db.addEvidence(dataToSave);
    }

    if (result.success) {
        emit('form-submitted');
        emit('update:modelValue', false);
    } else {
        console.error('Failed to save evidence:', result.error);
    }
}
</script>