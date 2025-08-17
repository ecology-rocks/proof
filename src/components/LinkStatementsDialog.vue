<template>
    <q-dialog :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)" persistent>
        <q-card style="width: 700px; max-width: 80vw;">
            <q-card-section>
                <div class="text-h6">Link Related Statements</div>
            </q-card-section>

            <q-card-section class="q-pt-none">
                <q-select filled v-model="selectedStatements" :options="availableStatements"
                    label="Select statements to link" multiple use-chips option-value="id" option-label="content"
                    emit-value map-options />
                <!-- We can add individual label editing later if needed -->
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

const props = defineProps(['modelValue', 'sourceStatementId', 'alreadyLinked']);
const emit = defineEmits(['update:modelValue', 'links-updated']);

const allStatements = ref([]);
const availableStatements = ref([]);
const selectedStatements = ref([]);

async function saveLinks() {
    const linksToSave = selectedStatements.value.map(id => ({ id }));
    const result = await window.db.updateStatementLinks({
        sourceStatementId: props.sourceStatementId,
        links: linksToSave,
    });
    if (result.success) {
        emit('links-updated');
        emit('update:modelValue', false);
    }
}

onMounted(async () => {
    const result = await window.db.getAllStatementsForLinking();
    if (result.success) {
        allStatements.value = result.statements;
    }
});

watch(() => props.modelValue, (isNowVisible) => {
    if (isNowVisible) {
        // Filter out the source statement itself from the list of options
        availableStatements.value = allStatements.value.filter(s => s.id !== props.sourceStatementId);
        // Pre-select the ones that are already linked
        selectedStatements.value = props.alreadyLinked.map(l => l.id);
    }
});
</script>