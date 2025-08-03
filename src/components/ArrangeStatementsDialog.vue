<template>
    <q-dialog :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)" persistent full-width>
        <q-card>
            <q-card-section>
                <div class="text-h6">Arrange Statements</div>
            </q-card-section>

            <q-card-section class="q-pt-none row">
                <div class="col-6 q-pa-sm">
                    <div class="text-subtitle1">Available Statements</div>
                    <q-list bordered separator>
                        <q-item v-for="statement in availableStatements" :key="statement.id" clickable
                            @click="addStatement(statement)">
                            <q-item-section>{{ statement.content }}</q-item-section>
                            <q-item-section side><q-icon name="add_circle" color="positive" /></q-item-section>
                        </q-item>
                    </q-list>
                </div>

                <div class="col-6 q-pa-sm">
                    <div class="text-subtitle1">Statements in Document (Drag to reorder)</div>
                    <q-list bordered separator class="draggable-list">
                        <q-item v-for="statement in selectedStatements" :key="statement.id" class="draggable-item">
                            <q-item-section>{{ statement.content }}</q-item-section>
                            <q-item-section side>
                                <q-icon name="drag_indicator" class="drag-handle cursor-pointer" />
                            </q-item-section>
                            <q-item-section side>
                                <q-btn flat round dense icon="remove_circle_outline" color="negative"
                                    @click="removeStatement(statement)" />
                            </q-item-section>
                        </q-item>
                    </q-list>
                </div>
            </q-card-section>

            <q-card-actions align="right">
                <q-btn flat label="Cancel" @click="$emit('update:modelValue', false)" />
                <q-btn flat label="Save Arrangement" @click="saveArrangement" />
            </q-card-actions>
        </q-card>
    </q-dialog>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue';
import Sortable from 'sortablejs';

const props = defineProps(['modelValue', 'documentId', 'alreadyLinkedStatements']);
const emit = defineEmits(['update:modelValue', 'statements-arranged']);

const allStatements = ref([]);
const selectedStatements = ref([]);
const availableStatements = ref([]);
let sortable = null;

// Filter available statements based on what's already selected
function updateAvailableStatements() {
    const selectedIds = new Set(selectedStatements.value.map(s => s.id));
    availableStatements.value = allStatements.value.filter(s => !selectedIds.has(s.id));
}

function addStatement(statement) {
    selectedStatements.value.push(statement);
    updateAvailableStatements();
}

function removeStatement(statement) {
    selectedStatements.value = selectedStatements.value.filter(s => s.id !== statement.id);
    updateAvailableStatements();
}

async function saveArrangement() {
    const orderedIds = selectedStatements.value.map(s => s.id);
    const result = await window.db.linkStatementsToDocument({
        documentId: props.documentId,
        orderedStatementIds: orderedIds,
    });

    if (result.success) {
        emit('statements-arranged');
        emit('update:modelValue', false);
    } else {
        console.error('Failed to save arrangement');
    }
}

// Initialize SortableJS when the list is ready
function initializeDragAndDrop() {
    const listEl = document.querySelector('.draggable-list');
    if (listEl) {
        sortable = Sortable.create(listEl, {
            handle: '.drag-handle',
            animation: 150,
            onEnd: (evt) => {
                const item = selectedStatements.value.splice(evt.oldIndex, 1)[0];
                selectedStatements.value.splice(evt.newIndex, 0, item);
            }
        });
    }
}

onMounted(async () => {
    const result = await window.db.getAllStatementsForLinking();
    if (result.success) {
        allStatements.value = result.statements;
        updateAvailableStatements();
    }
});

// Watch for the dialog opening to initialize and set data
watch(() => props.modelValue, (isNowVisible) => {
    if (isNowVisible) {
        selectedStatements.value = [...props.alreadyLinkedStatements];
        updateAvailableStatements();
        // Use nextTick to ensure the DOM is updated before initializing SortableJS
        import('vue').then(vue => {
            vue.nextTick(() => {
                initializeDragAndDrop();
            });
        });
    } else {
        if (sortable) {
            sortable.destroy();
            sortable = null;
        }
    }
});
</script>