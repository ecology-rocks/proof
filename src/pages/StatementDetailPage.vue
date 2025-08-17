<template>
  <q-page class="q-pa-md">
    <q-btn flat round dense icon="arrow_back" @click="goBack" class="q-mb-md" aria-label="Back" />

    <div v-if="statement">
      <div class="text-h5 q-mb-md">{{ statement.content }}</div>
      <q-separator class="q-my-xl" />

      <!-- Supporting Evidence Section -->
      <div class="row items-center justify-between q-mb-md">
        <div class="text-h6">Supporting Evidence</div>
        <q-btn label="Link Evidence" color="primary" @click="linkEvidence" />
      </div>
      <div v-if="linkedEvidence.length === 0" class="text-center text-grey q-mt-lg">
        No evidence has been linked to this statement.
      </div>
      <q-list v-else bordered separator>
        <q-item v-for="item in linkedEvidence" :key="item.id">
          <q-item-section>
            <div @click="$router.push(`/evidence/${item.id}`)" class="cursor-pointer">
              <q-item-label class="text-body1">
                <div v-html="item.content"></div>
              </q-item-label>
              <q-item-label caption>
                From: {{ item.referenceTitle }}
                <span v-if="item.page_number"> (p. {{ item.page_number }})</span>
              </q-item-label>
              <div class="row items-center q-mt-xs">
                <div class="row items-center no-wrap">
                  <span class="text-caption text-grey-7 q-mr-xs">Strength:</span>
                  <q-rating :model-value="item.rating_strength" size="xs" color="amber" icon="star" readonly />
                </div>
                <div class="row items-center no-wrap q-ml-md">
                  <span class="text-caption text-grey-7 q-mr-xs">Reliability:</span>
                  <q-rating :model-value="item.rating_reliability" size="xs" color="deep-purple" icon="verified_user"
                    readonly />
                </div>
              </div>
              <div v-if="item.tags && item.tags.length" class="q-mt-sm q-gutter-xs">
                <q-chip v-for="tag in item.tags" :key="tag" dense outline color="grey-7" size="sm">
                  {{ tag }}
                </q-chip>
              </div>
            </div>
          </q-item-section>
          <q-item-section side>
            <div class="row">
              <q-btn icon="edit" flat round color="grey" @click="openEvidenceForm(item)" />
              <q-btn icon="link_off" flat round color="grey" @click="confirmUnlink(item)" />
              <q-btn icon="arrow_forward" flat round color="grey" :to="`/evidence/${item.id}`" />
            </div>
          </q-item-section>
        </q-item>
      </q-list>

      <q-separator class="q-my-xl" />

      <!-- Related Statements Section -->
      <div class="row items-center justify-between q-mb-md">
        <div class="text-h6">Related Statements</div>
        <q-btn label="Link Statements" color="primary" @click="isLinkStatementsDialogOpen = true" />
      </div>
      <div v-if="relatedStatements.length === 0" class="text-grey">
        No other statements have been linked.
      </div>
      <!-- In StatementDetailPage.vue, replace the relatedStatements q-list -->
      <q-list v-else bordered separator>
        <q-item v-for="link in relatedStatements" :key="link.id">
          <!-- Main content section -->
          <q-item-section>
            <!-- This inner div is now the clickable navigation area -->
            <div @click="$router.push(`/statement/${link.id}`)" class="cursor-pointer">
              <q-item-label>{{ link.content }}</q-item-label>
              <q-item-label caption>{{ link.label }}</q-item-label>
            </div>
          </q-item-section>

          <!-- Side section with buttons, now separate from the click handler -->
          <q-item-section side>
            <div class="row">
              <q-btn icon="link_off" flat round color="grey" @click="confirmUnlinkStatement(link)" />
              <q-btn icon="arrow_forward" flat round color="grey" :to="`/statement/${link.id}`" />
            </div>
          </q-item-section>
        </q-item>
      </q-list>

      <q-separator class="q-my-xl" />

      <!-- Used in Documents Section -->
      <div v-if="linkedDocuments.length > 0">
        <div class="text-h6">Used in Documents</div>
        <q-list bordered separator dense>
          <q-item v-for="doc in linkedDocuments" :key="doc.id" clickable :to="`/document/${doc.id}`">
            <q-item-section avatar>
              <q-icon name="article" color="grey" />
            </q-item-section>
            <q-item-section>
              {{ doc.title }}
            </q-item-section>
            <q-item-section side>
              <q-icon name="arrow_forward_ios" color="grey" size="xs" />
            </q-item-section>
          </q-item>
        </q-list>
      </div>

    </div>
    <div v-else class="text-center">
      <q-spinner-dots color="primary" size="40px" />
      <p>Loading statement...</p>
    </div>

    <!-- Dialogs -->
    <link-evidence-dialog v-if="statement" v-model="isLinkEvidenceDialogOpen" :statement-id="statement.id"
      :already-linked-ids="linkedEvidenceIds" @evidence-linked="fetchDetails" />
    <add-evidence-dialog v-model="isEvidenceFormOpen" :evidence-to-edit="editingEvidence"
      @form-submitted="fetchDetails" />
    <link-statements-dialog v-if="statement" v-model="isLinkStatementsDialogOpen" :source-statement-id="statement.id"
      :already-linked="relatedStatements" @links-updated="fetchDetails" />
  </q-page>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router'; // 1. Add useRouter
import { useQuasar } from 'quasar';
import LinkEvidenceDialog from 'src/components/LinkEvidenceDialog.vue';
import AddEvidenceDialog from 'src/components/AddEvidenceDialog.vue';
import LinkStatementsDialog from 'src/components/LinkStatementsDialog.vue';

const $q = useQuasar();
const route = useRoute();
const router = useRouter(); // 2. Create router instance
const statement = ref(null);
const linkedEvidence = ref([]);
const linkedDocuments = ref([]);
const relatedStatements = ref([]);
const isLinkEvidenceDialogOpen = ref(false); // 3. Define this variable
const isEvidenceFormOpen = ref(false);
const editingEvidence = ref(null);
const isLinkStatementsDialogOpen = ref(false);

// 4. Define the goBack function
function goBack() {
  router.back();
}

async function fetchDetails() {
  const statementId = parseInt(route.params.id, 10);
  if (isNaN(statementId)) return;

  const detailsResult = await window.db.getStatementDetails(statementId);
  if (detailsResult.success) {
    statement.value = detailsResult.statement;
    linkedEvidence.value = detailsResult.evidence;
    linkedDocuments.value = detailsResult.documents;
  }

  const linksResult = await window.db.getStatementLinks(statementId);
  if (linksResult.success) {
    relatedStatements.value = linksResult.links;
  }
}


watch(() => route.params.id, (newId) => {
  if (newId) {
    fetchDetails();
  }
});


function openEvidenceForm(evidence = null) {
  editingEvidence.value = evidence;
  isEvidenceFormOpen.value = true;
}

function linkEvidence() {
  isLinkEvidenceDialogOpen.value = true;
}

async function confirmUnlink(evidence) {
  $q.dialog({
    title: 'Confirm Unlink',
    message: 'Are you sure you want to remove the link to this piece of evidence?',
    cancel: true,
    persistent: true
  }).onOk(async () => {
    const result = await window.db.unlinkEvidenceFromStatement({
      statementId: statement.value.id,
      evidenceId: evidence.id
    });
    if (result.success) {
      $q.notify({ color: 'green-4', message: 'Evidence unlinked' });
      await fetchDetails();
    } else {
      $q.notify({ color: 'red-5', message: 'Error: Could not unlink evidence' });
    }
  });
}

const linkedEvidenceIds = computed(() => {
  return linkedEvidence.value.map(item => item.id);
});

async function confirmUnlinkStatement(targetStatement) {
  $q.dialog({
    title: 'Confirm Unlink',
    message: 'Are you sure you want to remove the link between these two statements?',
    cancel: true,
    persistent: true
  }).onOk(async () => {
    const result = await window.db.unlinkStatementLink({
      sourceId: statement.value.id,
      targetId: targetStatement.id
    });
    if (result.success) {
      $q.notify({ color: 'green-4', message: 'Link removed' });
      await fetchDetails(); // Refresh the list
    } else {
      $q.notify({ color: 'red-5', message: 'Error: Could not remove link' });
    }
  });
}

onMounted(() => {
  fetchDetails();
});
</script>