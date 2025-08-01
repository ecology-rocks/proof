import { app, BrowserWindow, ipcMain } from 'electron'
import path from 'node:path'
import os from 'node:os'
import { fileURLToPath } from 'node:url'
import knex from 'knex'

// Initialize the database
const db = knex({
  client: 'sqlite3',
  connection: {
    // This will create the database file in a platform-agnostic, user-specific directory
    filename: path.join(app.getPath('userData'), 'proof_database.sqlite3')
  },
  useNullAsDefault: true // Recommended for SQLite
});

// Check if the tables exist and create them if they don't
async function setupDatabase() {
  try {
    const hasReferences = await db.schema.hasTable('references');
    if (!hasReferences) {
      await db.schema.createTable('references', table => {
        table.increments('id').primary();
        table.string('title');
        table.string('author');
        table.integer('year');
        table.timestamps(true, true);
      });
      console.log("Created 'references' table.");
    }
    // We can add more tables here as we build the app
    // e.g., 'evidence', 'statements', etc.

    // inside setupDatabase() in src-electron/electron-main.js

// ... after creating the 'references' table
const hasEvidence = await db.schema.hasTable('evidence');
if (!hasEvidence) {
  await db.schema.createTable('evidence', table => {
    table.increments('id').primary();
    table.text('content').notNullable(); // The actual quote or note
    table.string('page_number');
    table.integer('reference_id').unsigned().references('id').inTable('references'); // The foreign key link
    table.timestamps(true, true);
  });
  console.log("Created 'evidence' table.");
}

// inside setupDatabase() in src-electron/electron-main.js

const hasStatements = await db.schema.hasTable('statements');
if (!hasStatements) {
  await db.schema.createTable('statements', table => {
    table.increments('id').primary();
    table.text('content').notNullable();
    table.timestamps(true, true);
  });
  console.log("Created 'statements' table.");
}

const hasEvidenceStatement = await db.schema.hasTable('evidence_statement');
if (!hasEvidenceStatement) {
  await db.schema.createTable('evidence_statement', table => {
    table.increments('id').primary();
    // Foreign keys to link evidence and statements
    table.integer('evidence_id').unsigned().references('id').inTable('evidence').onDelete('CASCADE');
    table.integer('statement_id').unsigned().references('id').inTable('statements').onDelete('CASCADE');
  });
  console.log("Created 'evidence_statement' join table.");
}



  } catch (e) {
    console.error('Error setting up database:', e);
  }
}
app.whenReady().then(setupDatabase)

// IPC handler to get all references
ipcMain.handle('get-all-references', async () => {
  try {
    const references = await db('references').select('*');
    return references;
  } catch (e) {
    console.error('Error fetching references:', e);
    return []; // Return empty array on error
  }
});

// IPC handler to add a new reference
ipcMain.handle('add-reference', async (event, referenceData) => {
  try {
    // Insert the new reference and get the ID
    const [insertedId] = await db('references').insert(referenceData);
    // Fetch the newly created record to return to the frontend
    const newReference = await db('references').where('id', insertedId).first();
    return { success: true, reference: newReference };
  } catch (e) {
    console.error('Error adding reference:', e);
    return { success: false, error: e.message };
  }
});

// IPC handler to get a single reference and its evidence
ipcMain.handle('get-reference-details', async (event, id) => {
  try {
    const reference = await db('references').where('id', id).first();
    const evidence = await db('evidence').where('reference_id', id);
    return { success: true, reference, evidence };
  } catch (e) {
    console.error('Error fetching reference details:', e);
    return { success: false, error: e.message };
  }
});

// IPC handler to add new evidence
ipcMain.handle('add-evidence', async (event, evidenceData) => {
  try {
    const [insertedId] = await db('evidence').insert(evidenceData);
    const newEvidence = await db('evidence').where('id', insertedId).first();
    return { success: true, evidence: newEvidence };
  } catch (e) {
    console.error('Error adding evidence:', e);
    return { success: false, error: e.message };
  }
});

// IPC handler to get all statements
ipcMain.handle('get-all-statements', async () => {
  try {
    const statements = await db('statements').select('*').orderBy('created_at', 'desc');
    return { success: true, statements };
  } catch (e) {
    console.error('Error fetching statements:', e);
    return { success: false, error: e.message };
  }
});

// IPC handler to add a new statement
ipcMain.handle('add-statement', async (event, statementData) => {
  try {
    const [insertedId] = await db('statements').insert(statementData);
    const newStatement = await db('statements').where('id', insertedId).first();
    return { success: true, statement: newStatement };
  } catch (e) {
    console.error('Error adding statement:', e);
    return { success: false, error: e.message };
  }
});

// IPC handler to get a single statement and its linked evidence
ipcMain.handle('get-statement-details', async (event, id) => {
  try {
    const statement = await db('statements').where('id', id).first();
    const evidence = await db('evidence')
      .join('evidence_statement', 'evidence.id', '=', 'evidence_statement.evidence_id')
      .where('evidence_statement.statement_id', id)
      .select('evidence.*');
    return { success: true, statement, evidence };
  } catch (e) {
    console.error('Error fetching statement details:', e);
    return { success: false, error: e.message };
  }
});

// Replace the old 'get-all-evidence' handler with this one
ipcMain.handle('get-all-evidence', async () => {
  try {
    const evidence = await db('evidence')
      .join('references', 'evidence.reference_id', '=', 'references.id')
      .select(
        'evidence.id',
        'evidence.content',
        'evidence.page_number',
        'references.title as referenceTitle' // Get the parent reference's title
      )
      .orderBy('evidence.created_at', 'desc');
    return { success: true, evidence };
  } catch (e) {
    console.error('Error fetching all evidence:', e);
    return { success: false, error: e.message };
  }
});

// IPC handler to save the links between a statement and evidence
ipcMain.handle('link-evidence-to-statement', async (event, { statementId, evidenceIds }) => {
  try {
    // Use a transaction to ensure all links are created or none are.
    await db.transaction(async (trx) => {
      // First, remove all existing links for this statement to prevent duplicates.
      await trx('evidence_statement').where('statement_id', statementId).del();

      // Then, insert the new links.
      if (evidenceIds && evidenceIds.length > 0) {
        const linksToInsert = evidenceIds.map(evidenceId => ({
          statement_id: statementId,
          evidence_id: evidenceId
        }));
        await trx('evidence_statement').insert(linksToInsert);
      }
    });
    return { success: true };
  } catch (e) {
    console.error('Error linking evidence:', e);
    return { success: false, error: e.message };
  }
});

// IPC handler to delete a reference and its associated data
ipcMain.handle('delete-reference', async (event, referenceId) => {
  try {
    await db.transaction(async (trx) => {
      // 1. Find all evidence IDs linked to this reference
      const evidenceIds = await trx('evidence')
        .where('reference_id', referenceId)
        .select('id')
        .then(rows => rows.map(r => r.id));

      // 2. If there's any evidence, delete its links from the join table
      if (evidenceIds.length > 0) {
        await trx('evidence_statement').whereIn('evidence_id', evidenceIds).del();
      }

      // 3. Delete the evidence itself
      await trx('evidence').where('reference_id', referenceId).del();

      // 4. Finally, delete the reference
      await trx('references').where('id', referenceId).del();
    });
    return { success: true };
  } catch (e) {
    console.error('Error deleting reference:', e);
    return { success: false, error: e.message };
  }
});

// IPC handler to delete a statement and its links
ipcMain.handle('delete-statement', async (event, statementId) => {
  try {
    await db.transaction(async (trx) => {
      // 1. Delete all links associated with this statement
      await trx('evidence_statement').where('statement_id', statementId).del();

      // 2. Delete the statement itself
      await trx('statements').where('id', statementId).del();
    });
    return { success: true };
  } catch (e) {
    console.error('Error deleting statement:', e);
    return { success: false, error: e.message };
  }
});

// IPC handler to delete a piece of evidence and its links
ipcMain.handle('delete-evidence', async (event, evidenceId) => {
  try {
    await db.transaction(async (trx) => {
      // 1. Delete all links associated with this evidence
      await trx('evidence_statement').where('evidence_id', evidenceId).del();

      // 2. Delete the evidence itself
      await trx('evidence').where('id', evidenceId).del();
    });
    return { success: true };
  } catch (e) {
    console.error('Error deleting evidence:', e);
    return { success: false, error: e.message };
  }
});

// IPC handler to unlink a single piece of evidence from a statement
ipcMain.handle('unlink-evidence-from-statement', async (event, { statementId, evidenceId }) => {
  try {
    await db('evidence_statement')
      .where({
        statement_id: statementId,
        evidence_id: evidenceId
      })
      .del();
    return { success: true };
  } catch (e) {
    console.error('Error unlinking evidence:', e);
    return { success: false, error: e.message };
  }
});


// IPC handler to update a statement
ipcMain.handle('update-statement', async (event, { id, content }) => {
  try {
    await db('statements').where('id', id).update({ content });
    return { success: true };
  } catch (e) {
    console.error('Error updating statement:', e);
    return { success: false, error: e.message };
  }
});


// IPC handler to update a reference
ipcMain.handle('update-reference', async (event, { id, title, author, year }) => {
  try {
    await db('references').where('id', id).update({ title, author, year });
    return { success: true };
  } catch (e) {
    console.error('Error updating reference:', e);
    return { success: false, error: e.message };
  }
});

// IPC handler to update a piece of evidence
ipcMain.handle('update-evidence', async (event, { id, content, page_number }) => {
  try {
    await db('evidence').where('id', id).update({ content, page_number });
    return { success: true };
  } catch (e) {
    console.error('Error updating evidence:', e);
    return { success: false, error: e.message };
  }
});



// add new IPC handlers above this line
// needed in case process is undefined under Linux
const platform = process.platform || os.platform()

const currentDir = fileURLToPath(new URL('.', import.meta.url))

let mainWindow

async function createWindow () {
  /**
   * Initial window options
   */
  mainWindow = new BrowserWindow({
    icon: path.resolve(currentDir, 'icons/icon.png'), // tray icon
    width: 1000,
    height: 600,
    useContentSize: true,
    webPreferences: {
      contextIsolation: true,
      // More info: https://v2.quasar.dev/quasar-cli-vite/developing-electron-apps/electron-preload-script
      preload: path.resolve(
        currentDir,
        path.join(process.env.QUASAR_ELECTRON_PRELOAD_FOLDER, 'electron-preload' + process.env.QUASAR_ELECTRON_PRELOAD_EXTENSION)
      )
    }
  })

  if (process.env.DEV) {
    await mainWindow.loadURL(process.env.APP_URL)
  } else {
    await mainWindow.loadFile('index.html')
  }

  if (process.env.DEBUGGING) {
    // if on DEV or Production with debug enabled
    mainWindow.webContents.openDevTools()
  } else {
    // we're on production; no access to devtools pls
    mainWindow.webContents.on('devtools-opened', () => {
      mainWindow.webContents.closeDevTools()
    })
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow()
  }
})
