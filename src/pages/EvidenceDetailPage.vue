<template>
  <q-page class="q-pa-md">
    <q-btn flat round dense icon="arrow_back" @click="goBack" class="q-mb-md" aria-label="Back" />
    <div v-if="evidence">
      <div class="text-h6">Evidence</div>
      <blockquote class="text-h5 q-my-md q-pl-md" style="border-left: 4px solid #ccc;">
        "{{ evidence.content }}"
      </blockquote>

      <div class="q-mb-xl">
        <div class="text-subtitle2 text-grey">Source Reference:</div>
        <q-item clickable :to="`/reference/${evidence.reference_id}`" class="q-px-none">
          <q-item-section>
            <q-item-label>{{ evidence.referenceTitle }}</q-item-label>
            <q-item-label caption v-if="evidence.page_number">Page: {{ evidence.page_number }}</q-item-label>
          </q-item-section>
          <q-item-section side>
            <q-icon name="arrow_forward_ios" color="grey" size="xs" />
          </q-item-section>
        </q-item>
      </div>

      <div v-if="linkedStatements.length > 0">
        <div class="text-h6">Supports the Following Statements</div>
        <q-list bordered separator>
          <q-item v-for="statement in linkedStatements" :key="statement.id" clickable
            :to="`/statement/${statement.id}`">
            <q-item-section>
              {{ statement.content }}
            </q-item-section>
            <q-item-section side>
              <q-icon name="arrow_forward_ios" color="grey" size="xs" />
            </q-item-section>
          </q-item>
        </q-list>
      </div>
      <div v-else class="text-grey">
        This evidence does not currently support any statements.
      </div>

    </div>
    <div v-else class="text-center">
      <q-spinner-dots color="primary" size="40px" />
    </div>
  </q-page>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const route = useRoute();
const router = useRouter();
const evidence = ref(null);
const linkedStatements = ref([]);

function goBack() {
  router.back();
}

async function fetchDetails() {
  const evidenceId = parseInt(route.params.id, 10);
  if (isNaN(evidenceId)) return;

  const result = await window.db.getEvidenceDetails(evidenceId);

  if (result.success) {
    evidence.value = result.evidence;
    linkedStatements.value = result.statements;
  }
}

onMounted(() => {
  fetchDetails();
});
</script>