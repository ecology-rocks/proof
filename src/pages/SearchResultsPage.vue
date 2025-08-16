<template>
  <q-page class="q-pa-md">
    <div class="text-h4 q-mb-md">Search Results for "{{ searchTerm }}"</div>

    <div v-if="isLoading" class="text-center">
      <q-spinner-dots color="primary" size="40px" />
    </div>

    <div v-else-if="!totalResults" class="text-center text-grey q-mt-xl">
      <q-icon name="search_off" size="4em" />
      <p class="q-mt-md">No results found.</p>
    </div>

    <div v-else class="q-gutter-y-lg">
      <!-- References -->
      <div v-if="results.references.length">
        <div class="text-h6">References ({{ results.references.length }})</div>
        <q-list bordered separator>
          <q-item v-for="ref in results.references" :key="`ref-${ref.id}`" clickable :to="`/reference/${ref.id}`">
            <q-item-section>
              <q-item-label>{{ ref.title }}</q-item-label>
              <q-item-label caption>{{ ref.author }} ({{ ref.year }})</q-item-label>
            </q-item-section>
          </q-item>
        </q-list>
      </div>

      <!-- Statements -->
      <div v-if="results.statements.length">
        <div class="text-h6">Statements ({{ results.statements.length }})</div>
        <q-list bordered separator>
          <q-item v-for="st in results.statements" :key="`st-${st.id}`" clickable :to="`/statement/${st.id}`">
            <q-item-section>{{ st.content }}</q-item-section>
          </q-item>
        </q-list>
      </div>

      <!-- Evidence -->
      <div v-if="results.evidence.length">
        <div class="text-h6">Evidence ({{ results.evidence.length }})</div>
        <q-list bordered separator>
          <q-item v-for="ev in results.evidence" :key="`ev-${ev.id}`" clickable :to="`/evidence/${ev.id}`">
            <q-item-section>
              <q-item-label>
                <div v-html="ev.content"></div>
              </q-item-label>
              <q-item-label caption>From: {{ ev.referenceTitle }}</q-item-label>
            </q-item-section>
          </q-item>
        </q-list>
      </div>
    </div>
  </q-page>
</template>

<script setup>
import { ref, watchEffect, computed } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();
const isLoading = ref(true);
const results = ref({
  references: [],
  statements: [],
  evidence: []
});

const searchTerm = computed(() => route.query.q || '');
const totalResults = computed(() =>
  results.value.references.length +
  results.value.statements.length +
  results.value.evidence.length
);

watchEffect(async () => {
  if (searchTerm.value) {
    isLoading.value = true;
    const response = await window.db.universalSearch(searchTerm.value);
    if (response.success) {
      results.value = response.results;
    }
    isLoading.value = false;
  }
});
</script>