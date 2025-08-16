<template>
  <q-layout view="lHh Lpr lFf">
    <q-header elevated>
      <q-toolbar>
        <q-btn flat dense round icon="menu" aria-label="Menu" @click="toggleLeftDrawer" />

        <q-toolbar-title>
          Proof
        </q-toolbar-title>

        <div>Quasar v{{ $q.version }}</div>
      </q-toolbar>
    </q-header>

    <q-drawer v-model="leftDrawerOpen" show-if-above bordered>
      <q-list>
        <q-item clickable to="/">
          <q-item-section avatar>
            <q-icon name="source" />
          </q-item-section>
          <q-item-section>
            <q-item-label>References</q-item-label>
          </q-item-section>
        </q-item>

        <q-item clickable to="/statements">
          <q-item-section avatar>
            <q-icon name="campaign" />
          </q-item-section>
          <q-item-section>
            <q-item-label>Statements</q-item-label>
          </q-item-section>
        </q-item>

        <q-item clickable to="/evidence">
          <q-item-section avatar>
            <q-icon name="format_quote" />
          </q-item-section>
          <q-item-section>
            <q-item-label>Evidence</q-item-label>
          </q-item-section>
        </q-item>

        <q-item clickable to="/documents">
          <q-item-section avatar>
            <q-icon name="article" />
          </q-item-section>
          <q-item-section>
            <q-item-label>Documents</q-item-label>
          </q-item-section>
        </q-item>

        <q-separator class="q-my-md" />

        <q-item-label header>Data Management</q-item-label>

        <q-item clickable @click="exportData">
          <q-item-section avatar>
            <q-icon name="archive" />
          </q-item-section>
          <q-item-section>
            <q-item-label>Create Full Backup</q-item-label>
          </q-item-section>
        </q-item>

        <q-item clickable @click="importData">
          <q-item-section avatar>
            <q-icon name="settings_backup_restore" />
          </q-item-section>
          <q-item-section>
            <q-item-label>Restore from Backup</q-item-label>
          </q-item-section>
        </q-item>

        <q-item clickable @click="mergeData">
          <q-item-section avatar>
            <q-icon name="merge_type" />
          </q-item-section>
          <q-item-section>
            <q-item-label>Merge from Backup</q-item-label>
          </q-item-section>
        </q-item>
        <q-item clickable @click="importShared">
          <q-item-section avatar>
            <q-icon name="group_add" />
          </q-item-section>
          <q-item-section>
            <q-item-label>Load Shared Document</q-item-label>
          </q-item-section>
        </q-item>
        <q-separator class="q-my-md" />

        <q-separator class="q-my-md" />
        <q-item-label header>
          Essential Links
        </q-item-label>

        <EssentialLink v-for="link in linksList" :key="link.title" v-bind="link" />
      </q-list>
    </q-drawer>

    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script setup>
import { ref } from 'vue'
import { useQuasar } from 'quasar'
import EssentialLink from 'components/EssentialLink.vue'

const $q = useQuasar();
const linksList = [
  {
    title: 'Docs',
    caption: 'quasar.dev',
    icon: 'school',
    link: 'https://quasar.dev'
  },
  {
    title: 'Github',
    caption: 'github.com/ecology-rocks',
    icon: 'code',
    link: 'https://github.com/ecology-rocks'
  },

]

async function exportData() {
  const result = await window.db.exportFullBackup();
  if (result.success) {
    $q.notify({
      type: 'positive',
      message: `Backup saved successfully to ${result.path}`,
      timeout: 5000
    });
  } else if (!result.cancelled) {
    $q.notify({ type: 'negative', message: 'An error occurred during export.' });
  }
}

async function importData() {
  $q.dialog({
    title: 'Confirm Restore',
    message: 'Restoring from a backup will completely ERASE all current data in the application. This action cannot be undone. Are you sure you want to continue?',
    color: 'negative',
    cancel: true,
    persistent: true
  }).onOk(async () => {
    const result = await window.db.importFullBackup();
    if (result.success) {
      $q.notify({
        type: 'positive',
        message: `Successfully restored ${result.count} references and their related data. The app will now reload.`,
        timeout: 5000,
        onDismiss: () => window.location.reload() // Reload to reflect changes everywhere
      });
    } else if (!result.cancelled) {
      $q.notify({ type: 'negative', message: 'An error occurred during restore.' });
    }
  });
}


async function mergeData() {
  $q.dialog({
    title: 'Confirm Merge',
    message: 'Merging from a backup will ADD all data from the file to your current library. It will NOT overwrite anything, but relationships (like which evidence supports which statement) from the backup file will be lost. Continue?',
    color: 'primary',
    cancel: true,
    persistent: true
  }).onOk(async () => {
    const result = await window.db.mergeFullBackup();
    if (result.success) {
      $q.notify({
        type: 'positive',
        message: `Successfully merged ${result.count} new items. The app will now reload.`,
        timeout: 5000,
        onDismiss: () => window.location.reload()
      });
    } else if (!result.cancelled) {
      $q.notify({ type: 'negative', message: 'An error occurred during merge.' });
    }
  });
}

async function importShared() {
  const result = await window.db.importSharedDocument();
  if (result.success) {
    $q.notify({
      type: 'positive',
      message: `Successfully imported ${result.count} new document(s) and related items. The app will now reload.`,
      timeout: 5000,
      onDismiss: () => window.location.reload()
    });
  } else if (!result.cancelled) {
    $q.notify({ type: 'negative', message: 'An error occurred during import.' });
  }
}

const leftDrawerOpen = ref(false)

function toggleLeftDrawer() {
  leftDrawerOpen.value = !leftDrawerOpen.value
}
</script>
