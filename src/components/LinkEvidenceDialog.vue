<template>
    <q-dialog :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)" persistent>
        <q-card style="width: 700px; max-width: 80vw;">
            <q-card-section>
                <div class="text-h6">Link Supporting Evidence</div>
            </q-card-section>

            <q-card-section class="q-pt-none">
                <q-list bordered separator>
                    <q-item v-for="item in allEvidence" :key="item.id">
                        <q-item-section side>
                            <q-checkbox v-model="selection" :val="item.id" />
                        </q-item-section>
                        <q-item-section>
                            <q-item-label>"{{ item.content }}"</q-item-label>
                        </q-item-section>
                    </q-item>
                </q-list>
            </q-card-section>

            <q-card-actions align="right">
                <q-btn flat label="Cancel" @click="$emit('update:modelValue', false)" />
                <q-btn flat label="Save Links" @click="saveLinks" />
            </q-card-actions>
        </q-card>
    </q-dialog>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue';

const props = defineProps(['modelValue', 'statementId', 'alreadyLinkedIds']);
const emit = defineEmits(['update:modelValue', 'evidence-linked']);

const allEvidence = ref([]);
const selection = ref([]);

async function fetchAllEvidence() {
    const result = await window.db.getAllEvidence();
    if (result.success) {
        allEvidence.value = result.evidence;
    }
}

async function saveLinks() {
    const result = await window.db.linkEvidenceToStatement({
        statementId: props.statementId,
        evidenceIds: [...selection.value],
    });

    if (result.success) {
        emit('evidence-linked');
        emit('update:modelValue', false);
    } else {
        console.error('Failed to link evidence:', result.error);
    }
}

onMounted(() => {
    fetchAllEvidence();
});

// When the dialog opens, pre-select the checkboxes for evidence that's already linked.
watch(() => props.modelValue, (isNowVisible) => {
    if (isNowVisible) {
        selection.value = [...props.alreadyLinkedIds];
    }
});
</script>