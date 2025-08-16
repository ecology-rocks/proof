<template>
    <q-dialog :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)" persistent>
        <q-card style="min-width: 500px">
            <q-card-section>
                <div class="text-h6">{{ formTitle }}</div>
            </q-card-section>

            <q-card-section class="q-pt-none">
                <q-form @submit="submitForm" class="q-gutter-md">
                    <q-editor v-model="formData.content" min-height="5rem" :toolbar="[
                        ['bold', 'italic', 'strike', 'underline'],
                        ['unordered', 'ordered'],
                        ['viewsource']
                    ]" />
                    <q-select filled v-model="selectedTags" :options="allTags" label="Tags" multiple use-chips use-input
                        new-value-mode="add-unique" />
                    <q-input filled v-model="formData.page_number" label="Page Number" />

                    <div class="q-gutter-y-sm q-px-sm">
                        <div class="column">
                            <label class="q-mb-sm">Strength</label>
                            <q-slider v-model="formData.rating_strength" :min="0" :max="5" label label-always snap
                                color="amber" />
                        </div>
                        <div class="column">
                            <label class="q-mb-sm">Reliability</label>
                            <q-slider v-model="formData.rating_reliability" :min="0" :max="5" label label-always snap
                                color="deep-purple" />
                        </div>
                    </div>
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
import { ref, computed, watch, onMounted } from 'vue';

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
    rating_strength: 0,
    rating_reliability: 0
});
const allTags = ref([]); // Holds all available tags for the dropdown
const selectedTags = ref([]); // Holds the tags for the current evidence item

const formTitle = computed(() => props.evidenceToEdit ? 'Edit Evidence' : 'New Evidence');

// Fetch all tags when the component is first created
onMounted(async () => {
    const result = await window.db.getAllTags();
    if (result.success) {
        allTags.value = result.tags.map(t => t.name);
    }
});

watch(() => props.modelValue, async (isNowVisible) => {
    if (isNowVisible) {
        if (props.evidenceToEdit) {
            formData.value = { ...props.evidenceToEdit };
            // Fetch the tags for the specific evidence being edited
            const result = await window.db.getTagsForEvidence(props.evidenceToEdit.id);
            if (result.success) {
                selectedTags.value = result.tags;
            }
        } else {
            // Reset form for adding new evidence
            formData.value = { content: '', page_number: '', rating_strength: 0, rating_reliability: 0 };
            selectedTags.value = [];
        }
    }
});

async function submitForm() {
    if (!formData.value.content) return;

    let result;
    let evidenceId;

    if (props.evidenceToEdit) {
        // Update existing evidence
        const dataToSave = { ...formData.value };
        delete dataToSave.referenceTitle;
        result = await window.db.updateEvidence(dataToSave);
        evidenceId = props.evidenceToEdit.id;
    } else {
        // Add new evidence
        const dataToSave = { ...formData.value, reference_id: props.referenceId };
        result = await window.db.addEvidence(dataToSave);
        // We get the new evidence object back from the addEvidence call
        evidenceId = result.evidence?.id;
    }

    if (result.success && evidenceId) {
        // After successfully saving the evidence, save the tags
        const tagResult = await window.db.updateEvidenceTags({
            evidenceId: evidenceId,
            tags: [...selectedTags.value]
        });
        if (tagResult.success) {
            emit('form-submitted');
            emit('update:modelValue', false);
        }
    } else {
        console.error('Failed to save evidence:', result.error);
    }
}
</script>