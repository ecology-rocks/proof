import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'path';
import os from 'os';
import fs from 'fs/promises';
import { createRequire } from 'module';
import { fileURLToPath } from 'url'; // <-- This was the missing import
import knex from 'knex';

// --- Setup for requiring older libraries ---
const require = createRequire(import.meta.url);
const bibtexParse = require('bibtex-parse');
const { Document, Packer, Paragraph, HeadingLevel, TextRun, AlignmentType, BorderStyle } = require('docx');
// ---

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


    // In src-electron/electron-main.js, inside the setupDatabase function
    const hasReferences = await db.schema.hasTable('references');
    if (!hasReferences) {
      await db.schema.createTable('references', table => {
        table.increments('id').primary();
        table.string('title').notNullable();
        table.string('author');
        table.integer('year');
        // --- New Fields ---
        table.string('entry_type'); // e.g., 'article', 'book'
        table.string('journal');
        table.string('volume');
        table.string('pages');
        table.string('publisher');
        table.string('doi');
        table.string('url');
        table.text('notes');
        // ---
        table.timestamps(true, true);
      });
      console.log("Created 'references' table.");
    }
    // ... after creating the 'references' table
    const hasEvidence = await db.schema.hasTable('evidence');
    if (!hasEvidence) {
      await db.schema.createTable('evidence', table => {
        table.increments('id').primary();
        table.text('content').notNullable(); // The actual quote or note
        table.string('page_number');
        table.integer('reference_id').unsigned().references('id').inTable('references'); // The foreign key link
        table.integer('rating_strength').defaultTo(0);
        table.integer('rating_reliability').defaultTo(0);
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

    const hasDocuments = await db.schema.hasTable('documents');
    if (!hasDocuments) {
      await db.schema.createTable('documents', table => {
        table.increments('id').primary();
        table.string('title').notNullable();
        table.text('content'); // For general notes or the body of the document
        table.text('excerpt'); // For a short excerpt or summary
        table.timestamps(true, true);
      });
      console.log("Created 'documents' table.");
    }

    const hasDocumentStatement = await db.schema.hasTable('document_statement');
    if (!hasDocumentStatement) {
      await db.schema.createTable('document_statement', table => {
        table.increments('id').primary();
        table.integer('document_id').unsigned().references('id').inTable('documents').onDelete('CASCADE');
        table.integer('statement_id').unsigned().references('id').inTable('statements').onDelete('CASCADE');
        table.integer('order').unsigned(); // To maintain the order of statements in a document
      });
      console.log("Created 'document_statement' join table.");
    }

    // In src-electron/electron-main.js, inside setupDatabase()

    const hasTags = await db.schema.hasTable('tags');
    if (!hasTags) {
      await db.schema.createTable('tags', table => {
        table.increments('id').primary();
        table.string('name').unique().notNullable();
      });
      console.log("Created 'tags' table.");
    }

    const hasEvidenceTag = await db.schema.hasTable('evidence_tag');
    if (!hasEvidenceTag) {
      await db.schema.createTable('evidence_tag', table => {
        table.increments('id').primary();
        table.integer('evidence_id').unsigned().references('id').inTable('evidence').onDelete('CASCADE');
        table.integer('tag_id').unsigned().references('id').inTable('tags').onDelete('CASCADE');
      });
      console.log("Created 'evidence_tag' join table.");
    }


    /// add new database tables above this line
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
    const [insertedId] = await db('references').insert(referenceData);
    const newReference = await db('references').where('id', insertedId).first();
    return { success: true, reference: newReference };
  } catch (e) { console.error('Error adding reference:', e); return { success: false, error: e.message }; }
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

// Replace the old 'get-statement-details' handler with this one
ipcMain.handle('get-statement-details', async (event, id) => {
  try {
    const statement = await db('statements').where('id', id).first();

    const evidence = await db('evidence')
      .join('evidence_statement', 'evidence.id', '=', 'evidence_statement.evidence_id')
      // --- Add this join to get the reference title ---
      .join('references', 'evidence.reference_id', '=', 'references.id')
      .where('evidence_statement.statement_id', id)
      .select('evidence.*', 'references.title as referenceTitle'); // And select the title

    const documents = await db('documents')
      .join('document_statement', 'documents.id', '=', 'document_statement.document_id')
      .where('document_statement.statement_id', id)
      .select('documents.*');

    return { success: true, statement, evidence, documents };
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
ipcMain.handle('update-reference', async (event, referenceData) => {
  try {
    const { id, ...dataToUpdate } = referenceData;
    await db('references').where('id', id).update(dataToUpdate);
    return { success: true };
  } catch (e) { console.error('Error updating reference:', e); return { success: false, error: e.message }; }
});

// IPC handler to update a piece of evidence
ipcMain.handle('update-evidence', async (event, evidenceData) => {
  try {
    const { id, ...dataToUpdate } = evidenceData; // Separates the ID from the rest of the data
    await db('evidence').where('id', id).update(dataToUpdate); // Updates all other fields
    return { success: true };
  } catch (e) {
    console.error('Error updating evidence:', e);
    return { success: false, error: e.message };
  }
});

// IPC handler to get all documents
ipcMain.handle('get-all-documents', async () => {
  try {
    const documents = await db('documents').select('*').orderBy('created_at', 'desc');
    return { success: true, documents };
  } catch (e) { console.error('Error fetching documents:', e); return { success: false, error: e.message }; }
});

// IPC handler to add a new document
ipcMain.handle('add-document', async (event, documentData) => {
  try {
    const [insertedId] = await db('documents').insert(documentData);
    const newDocument = await db('documents').where('id', insertedId).first();
    return { success: true, document: newDocument };
  } catch (e) { console.error('Error adding document:', e); return { success: false, error: e.message }; }
});

// IPC handler to get a single document and its linked statements
ipcMain.handle('get-document-details', async (event, id) => {
  try {
    const document = await db('documents').where('id', id).first();
    const statements = await db('statements')
      .join('document_statement', 'statements.id', '=', 'document_statement.statement_id')
      .where('document_statement.document_id', id)
      .select('statements.*', 'document_statement.order')
      .orderBy('document_statement.order', 'asc');
    return { success: true, document, statements };
  } catch (e) {
    console.error('Error fetching document details:', e);
    return { success: false, error: e.message };
  }
});


// IPC handler to get all statements for linking to a document
ipcMain.handle('get-all-statements-for-linking', async () => {
  try {
    const statements = await db('statements').select('*');
    return { success: true, statements };
  } catch (e) { console.error('Error fetching statements for linking:', e); return { success: false, error: e.message }; }
});

// IPC handler to save the ordered links between a document and its statements
ipcMain.handle('link-statements-to-document', async (event, { documentId, orderedStatementIds }) => {
  try {
    await db.transaction(async (trx) => {
      // First, remove all existing links for this document.
      await trx('document_statement').where('document_id', documentId).del();

      // Then, insert the new links with the correct order.
      if (orderedStatementIds && orderedStatementIds.length > 0) {
        const linksToInsert = orderedStatementIds.map((statementId, index) => ({
          document_id: documentId,
          statement_id: statementId,
          order: index
        }));
        await trx('document_statement').insert(linksToInsert);
      }
    });
    return { success: true };
  } catch (e) { console.error('Error linking statements:', e); return { success: false, error: e.message }; }
});


// IPC handler to get a single piece of evidence and its connections
ipcMain.handle('get-evidence-details', async (event, id) => {
  try {
    const evidence = await db('evidence')
      .join('references', 'evidence.reference_id', '=', 'references.id')
      .where('evidence.id', id)
      .select(
        'evidence.*',
        'references.title as referenceTitle'
      )
      .first();

    const statements = await db('statements')
      .join('evidence_statement', 'statements.id', '=', 'evidence_statement.statement_id')
      .where('evidence_statement.evidence_id', id)
      .select('statements.*');

    return { success: true, evidence, statements };
  } catch (e) {
    console.error('Error fetching evidence details:', e);
    return { success: false, error: e.message };
  }
});

// IPC handler to update a document's title and excerpt
ipcMain.handle('update-document', async (event, { id, title, excerpt }) => {
  try {
    await db('documents').where('id', id).update({ title, excerpt });
    return { success: true };
  } catch (e) { console.error('Error updating document:', e); return { success: false, error: e.message }; }
});

// IPC handler to delete a document and its statement links
ipcMain.handle('delete-document', async (event, documentId) => {
  try {
    await db.transaction(async (trx) => {
      // First, delete all links in the join table
      await trx('document_statement').where('document_id', documentId).del();
      // Then, delete the document itself
      await trx('documents').where('id', documentId).del();
    });
    return { success: true };
  } catch (e) { console.error('Error deleting document:', e); return { success: false, error: e.message }; }
});


// IPC handler to generate a Markdown file and save it
ipcMain.handle('export-document-as-markdown', async (event, documentId) => {
  try {
    // 1. Fetch all the necessary data
    const document = await db('documents').where('id', documentId).first();
    if (!document) {
      throw new Error('Document not found');
    }

    const statements = await db('statements')
      .join('document_statement', 'statements.id', '=', 'document_statement.statement_id')
      .where('document_statement.document_id', documentId)
      .select('statements.*')
      .orderBy('document_statement.order', 'asc');

    // 2. Build the Markdown string
    let markdownContent = `# ${document.title}\n\n`;
    if (document.excerpt) {
      markdownContent += `*${document.excerpt}*\n\n---\n\n`;
    }
    if (document.content) {
      markdownContent += `${document.content}\n\n`;
    }

    for (const statement of statements) {
      markdownContent += `## ${statement.content}\n\n`;
      markdownContent += `### Supporting Evidence\n\n`;

      const evidence = await db('evidence')
        .join('evidence_statement', 'evidence.id', '=', 'evidence_statement.evidence_id')
        .join('references', 'evidence.reference_id', '=', 'references.id')
        .where('evidence_statement.statement_id', statement.id)
        .select('evidence.content', 'evidence.page_number', 'references.title as referenceTitle');

      if (evidence.length === 0) {
        markdownContent += `*No evidence linked.*\n\n`;
      } else {
        for (const ev of evidence) {
          markdownContent += `> ${ev.content}\n`;
          markdownContent += `> — *From: ${ev.referenceTitle}${ev.page_number ? ` (p. ${ev.page_number})` : ''}*\n\n`;
        }
      }
    }

    // 3. Show a "Save File" dialog to the user
    const { filePath } = await dialog.showSaveDialog({
      title: 'Export Document as Markdown',
      defaultPath: `${document.title.replace(/ /g, '_')}.md`,
      filters: [{ name: 'Markdown Files', extensions: ['md'] }]
    });

    // 4. If the user chose a path, write the file
    if (filePath) {
      await fs.writeFile(filePath, markdownContent);
      return { success: true, path: filePath };
    }

    // User cancelled the save dialog
    return { success: false, cancelled: true };

  } catch (e) {
    console.error('Error exporting document:', e);
    return { success: false, error: e.message };
  }
});

// IPC handler to import references from a .bib file
ipcMain.handle('import-from-bibtex', async () => {
  try {
    const { filePaths } = await dialog.showOpenDialog({
      title: 'Import from BibTeX',
      filters: [{ name: 'BibTeX Files', extensions: ['bib'] }],
      properties: ['openFile']
    });

    if (!filePaths || filePaths.length === 0) {
      return { success: false, cancelled: true };
    }

    const fileContent = await fs.readFile(filePaths[0], 'utf8');
    const entries = bibtexParse.parse(fileContent);
    const referencesToInsert = [];

    // --- THIS IS THE CORRECTED LOGIC ---
    for (const entry of entries) {
      // Skip if it's not a real entry (like a comment)
      if (entry.itemtype !== 'entry' || !entry.fields) {
        continue;
      }

      // Convert the 'fields' array into a simple key-value object
      const tags = entry.fields.reduce((acc, field) => {
        acc[field.name] = field.value;
        return acc;
      }, {});

      referencesToInsert.push({
        entry_type: entry.type, // Use 'type' instead of 'entryType'
        title: (tags.title || 'No Title').replace(/{{|}}/g, ''),
        author: tags.author,
        year: parseInt(tags.year, 10) || null,
        journal: tags.journal,
        volume: tags.volume,
        pages: tags.pages,
        publisher: tags.institution || tags.publisher, // Handle 'institution' for tech reports
        doi: tags.doi,
        url: tags.url,
        notes: tags.abstract || tags.note // Use abstract as notes if available
      });
    }

    if (referencesToInsert.length > 0) {
      await db('references').insert(referencesToInsert);
    }

    return { success: true, count: referencesToInsert.length };
  } catch (e) {
    console.error('Error importing from BibTeX:', e);
    return { success: false, error: e.message };
  }
});

// IPC handler to get all tags
ipcMain.handle('get-all-tags', async () => {
  try {
    const tags = await db('tags').select('*').orderBy('name', 'asc');
    return { success: true, tags };
  } catch (e) { console.error('Error fetching tags:', e); return { success: false, error: e.message }; }
});

// IPC handler to get tags for a specific piece of evidence
ipcMain.handle('get-tags-for-evidence', async (event, evidenceId) => {
  try {
    const tags = await db('tags')
      .join('evidence_tag', 'tags.id', '=', 'evidence_tag.tag_id')
      .where('evidence_tag.evidence_id', evidenceId)
      .select('tags.name');
    return { success: true, tags: tags.map(t => t.name) };
  } catch (e) { console.error('Error fetching evidence tags:', e); return { success: false, error: e.message }; }
});

// IPC handler to update the tags for a piece of evidence
ipcMain.handle('update-evidence-tags', async (event, { evidenceId, tags }) => {
  try {
    await db.transaction(async (trx) => {
      // 1. Find or create all tags and get their IDs
      const tagIds = await Promise.all(tags.map(async (tagName) => {
        let tag = await trx('tags').where('name', tagName).first();
        if (tag) {
          return tag.id;
        }
        const [newTagId] = await trx('tags').insert({ name: tagName });
        return newTagId;
      }));

      // 2. Remove existing links for this evidence
      await trx('evidence_tag').where('evidence_id', evidenceId).del();

      // 3. Insert the new links
      if (tagIds.length > 0) {
        const linksToInsert = tagIds.map(tagId => ({
          evidence_id: evidenceId,
          tag_id: tagId,
        }));
        await trx('evidence_tag').insert(linksToInsert);
      }
    });
    return { success: true };
  } catch (e) { console.error('Error updating evidence tags:', e); return { success: false, error: e.message }; }
});

// IPC handler to export the entire database to a JSON file
ipcMain.handle('export-full-backup', async () => {
  try {
    const tables = [
      'references', 'evidence', 'statements', 'documents', 'tags',
      'evidence_tag', 'evidence_statement', 'document_statement'
    ];
    const backupData = {
      version: 1,
      exportDate: new Date().toISOString(),
      data: {}
    };

    for (const table of tables) {
      backupData.data[table] = await db(table).select('*');
    }

    const { filePath } = await dialog.showSaveDialog({
      title: 'Export Full Backup',
      defaultPath: `proof_backup_${new Date().toISOString().split('T')[0]}.json`,
      filters: [{ name: 'JSON Files', extensions: ['json'] }]
    });

    if (filePath) {
      await fs.writeFile(filePath, JSON.stringify(backupData, null, 2));
      return { success: true, path: filePath };
    }

    return { success: false, cancelled: true };
  } catch (e) {
    console.error('Error exporting backup:', e);
    return { success: false, error: e.message };
  }
});

// IPC handler to import data from a JSON file, wiping existing data
ipcMain.handle('import-full-backup', async () => {
  try {
    const { filePaths } = await dialog.showOpenDialog({
      title: 'Import Full Backup',
      filters: [{ name: 'JSON Files', extensions: ['json'] }],
      properties: ['openFile']
    });

    if (!filePaths || filePaths.length === 0) {
      return { success: false, cancelled: true };
    }

    const fileContent = await fs.readFile(filePaths[0], 'utf8');
    const backupData = JSON.parse(fileContent);

    // The order of tables matters due to foreign keys.
    // Delete from child tables first, then parent tables.
    const tablesToDelete = [
      'document_statement', 'evidence_statement', 'evidence_tag',
      'tags', 'documents', 'evidence', 'statements', 'references'
    ];
    // Insert into parent tables first, then child tables.
    const tablesToInsert = [
      'references', 'statements', 'evidence', 'documents', 'tags',
      'evidence_tag', 'evidence_statement', 'document_statement'
    ];

    await db.transaction(async (trx) => {
      // Temporarily disable foreign key checks for the transaction
      await trx.raw('PRAGMA foreign_keys = OFF');

      for (const table of tablesToDelete) {
        await trx(table).del();
      }

      // Reset autoincrement counters for sqlite
      await trx('sqlite_sequence').del();

      for (const table of tablesToInsert) {
        if (backupData.data[table] && backupData.data[table].length > 0) {
          await trx(table).insert(backupData.data[table]);
        }
      }

      // Re-enable foreign key checks
      await trx.raw('PRAGMA foreign_keys = ON');
    });

    return { success: true, count: backupData.data.references.length };
  } catch (e) {
    console.error('Error importing backup:', e);
    return { success: false, error: e.message };
  }
});

// IPC handler to merge data from a JSON file without wiping existing data
ipcMain.handle('merge-full-backup', async () => {
  try {
    const { filePaths } = await dialog.showOpenDialog({
      title: 'Merge from Backup',
      filters: [{ name: 'JSON Files', extensions: ['json'] }],
      properties: ['openFile']
    });

    if (!filePaths || filePaths.length === 0) {
      return { success: false, cancelled: true };
    }

    const fileContent = await fs.readFile(filePaths[0], 'utf8');
    const backupData = JSON.parse(fileContent);

    // We only import the core data tables, not the relationship tables.
    const tablesToMerge = ['references', 'statements', 'evidence', 'documents', 'tags'];
    let totalImported = 0;

    await db.transaction(async (trx) => {
      for (const table of tablesToMerge) {
        if (backupData.data[table] && backupData.data[table].length > 0) {
          // Remove IDs and timestamps to allow the database to assign new ones
          const cleanedData = backupData.data[table].map(item => {
            delete item.id;
            delete item.created_at;
            delete item.updated_at;
            return item;
          });
          await trx(table).insert(cleanedData);
          totalImported += cleanedData.length;
        }
      }
    });

    return { success: true, count: totalImported };
  } catch (e) {
    console.error('Error merging backup:', e);
    return { success: false, error: e.message };
  }
});

// IPC handler to export a single document and all its related data
ipcMain.handle('export-shared-document', async (event, documentId) => {
  try {
    const document = await db('documents').where('id', documentId).first();
    if (!document) throw new Error('Document not found');

    // Get IDs of all statements in the document
    const statementLinks = await db('document_statement').where('document_id', documentId);
    const statementIds = statementLinks.map(l => l.statement_id);

    // Get IDs of all evidence linked to those statements
    const evidenceLinks = await db('evidence_statement').whereIn('statement_id', statementIds);
    const evidenceIds = [...new Set(evidenceLinks.map(l => l.evidence_id))]; // Use Set to get unique IDs

    // Get IDs of all references linked to that evidence
    const evidenceParents = await db('evidence').whereIn('id', evidenceIds).select('reference_id');
    const referenceIds = [...new Set(evidenceParents.map(e => e.reference_id))];

    // Get IDs of all tags linked to that evidence
    const tagLinks = await db('evidence_tag').whereIn('evidence_id', evidenceIds);
    const tagIds = [...new Set(tagLinks.map(l => l.tag_id))];

    // Now fetch the full data for all the unique IDs we found
    const backupData = {
      type: 'ProofSharedDocument',
      version: 1,
      exportDate: new Date().toISOString(),
      data: {
        documents: [document],
        statements: await db('statements').whereIn('id', statementIds),
        evidence: await db('evidence').whereIn('id', evidenceIds),
        references: await db('references').whereIn('id', referenceIds),
        tags: await db('tags').whereIn('id', tagIds),
        document_statement: statementLinks,
        evidence_statement: evidenceLinks,
        evidence_tag: tagLinks
      }
    };

    const { filePath } = await dialog.showSaveDialog({
      title: 'Export Shared Document',
      defaultPath: `${document.title.replace(/ /g, '_')}.proofshare.json`,
      filters: [{ name: 'Proof Shareable Document', extensions: ['json'] }]
    });

    if (filePath) {
      await fs.writeFile(filePath, JSON.stringify(backupData, null, 2));
      return { success: true, path: filePath };
    }

    return { success: false, cancelled: true };
  } catch (e) {
    console.error('Error exporting shared document:', e);
    return { success: false, error: e.message };
  }
});

// IPC handler to import a shared document pack non-destructively
ipcMain.handle('import-shared-document', async () => {
  try {
    const { filePaths } = await dialog.showOpenDialog({
      title: 'Import Shared Document',
      filters: [{ name: 'Proof Shareable Document', extensions: ['json'] }],
      properties: ['openFile']
    });

    if (!filePaths || filePaths.length === 0) {
      return { success: false, cancelled: true };
    }

    const fileContent = await fs.readFile(filePaths[0], 'utf8');
    const backupData = JSON.parse(fileContent);

    if (backupData.type !== 'ProofSharedDocument') {
      throw new Error('This is not a valid Proof shareable document file.');
    }

    const idMaps = {
      references: {}, statements: {}, evidence: {}, documents: {}, tags: {}
    };

    await db.transaction(async (trx) => {
      // Step 1: Insert primary items and create ID maps
      for (const tableName of Object.keys(idMaps)) {
        if (backupData.data[tableName]) {
          for (const item of backupData.data[tableName]) {
            const oldId = item.id;
            delete item.id;
            delete item.created_at;
            delete item.updated_at;
            const [newId] = await trx(tableName).insert(item);
            idMaps[tableName][oldId] = newId;
          }
        }
      }

      // Step 2: Re-link relationships using the ID maps
      const joinTables = ['document_statement', 'evidence_statement', 'evidence_tag'];
      for (const tableName of joinTables) {
        if (backupData.data[tableName]) {
          const linksToInsert = backupData.data[tableName].map(link => {
            const newLink = {};
            for (const key in link) {
              if (key.endsWith('_id')) {
                // --- THIS IS THE CORRECTED LOGIC ---
                let table = key.replace('_id', 's');
                if (table === 'evidences') {
                  table = 'evidence'; // Handle the irregular plural
                }
                // ---
                newLink[key] = idMaps[table][link[key]];
              } else if (key !== 'id') {
                newLink[key] = link[key];
              }
            }
            return newLink;
          }).filter(l => Object.values(l).every(val => val !== undefined));

          if (linksToInsert.length > 0) {
            await trx(tableName).insert(linksToInsert);
          }
        }
      }
    });

    return { success: true, count: backupData.data.documents.length };
  } catch (e) {
    console.error('Error importing shared document:', e);
    return { success: false, error: e.message };
  }
});


// IPC handler to generate a .docx file and save it
ipcMain.handle('export-document-as-docx', async (event, documentId) => {
  try {
    // 1. Fetch all the necessary data (same as Markdown export)
    const documentData = await db('documents').where('id', documentId).first();
    if (!documentData) throw new Error('Document not found');

    const statements = await db('statements')
      .join('document_statement', 'statements.id', '=', 'document_statement.statement_id')
      .where('document_statement.document_id', documentId)
      .select('statements.*')
      .orderBy('document_statement.order', 'asc');

    const children = [];

    // 2. Build the document structure using the docx library
    // Document Title
    children.push(new Paragraph({ text: documentData.title, heading: HeadingLevel.TITLE }));

    // Excerpt
    if (documentData.excerpt) {
      children.push(new Paragraph({ children: [new TextRun({ text: documentData.excerpt, italics: true })], alignment: AlignmentType.CENTER }));
    }
    children.push(new Paragraph({ text: "" })); // Spacer

    // Loop through statements and their evidence
    for (const statement of statements) {
      children.push(new Paragraph({ text: statement.content, heading: HeadingLevel.HEADING_2 }));
      children.push(new Paragraph({ text: "Supporting Evidence", heading: HeadingLevel.HEADING_3 }));

      const evidence = await db('evidence')
        .join('evidence_statement', 'evidence.id', '=', 'evidence_statement.evidence_id')
        .join('references', 'evidence.reference_id', '=', 'references.id')
        .where('evidence_statement.statement_id', statement.id)
        .select('evidence.content', 'evidence.page_number', 'references.title as referenceTitle');

      if (evidence.length === 0) {
        children.push(new Paragraph({ children: [new TextRun({ text: "No evidence linked.", italics: true })] }));
      } else {
        for (const ev of evidence) {
          const sourceText = `— From: ${ev.referenceTitle}${ev.page_number ? ` (p. ${ev.page_number})` : ''}`;
          // The docx library needs HTML to be stripped or handled differently.
          // For simplicity, we'll strip HTML tags.
          const cleanContent = ev.content.replace(/<[^>]*>?/gm, '');

          children.push(new Paragraph({
            text: `"${cleanContent}"`,
            style: "wellSpaced",
            border: { left: { style: BorderStyle.SINGLE, size: 4, color: "auto" } },
            indent: { left: 720 }, // 720 TWIPs = 0.5 inch
          }));
          children.push(new Paragraph({ children: [new TextRun({ text: sourceText, italics: true })], alignment: AlignmentType.RIGHT }));
          children.push(new Paragraph({ text: "" })); // Spacer
        }
      }
    }

    const doc = new Document({ sections: [{ children }] });

    // 3. Generate the file buffer
    const buffer = await Packer.toBuffer(doc);

    const { filePath } = await dialog.showSaveDialog({
      title: 'Export Document as DOCX',
      defaultPath: `${documentData.title.replace(/ /g, '_')}.docx`,
      filters: [{ name: 'Word Documents', extensions: ['docx'] }]
    });

    if (filePath) {
      await fs.writeFile(filePath, buffer);
      return { success: true, path: filePath };
    }

    return { success: false, cancelled: true };

  } catch (e) {
    console.error('Error exporting document as docx:', e);
    return { success: false, error: e.message };
  }
});


// IPC handler for universal search across multiple tables
ipcMain.handle('universal-search', async (event, searchTerm) => {
  try {
    const searchPattern = `%${searchTerm}%`; // Prepare pattern for LIKE query

    const references = await db('references')
      .where('title', 'like', searchPattern)
      .orWhere('author', 'like', searchPattern)
      .orWhere('notes', 'like', searchPattern)
      .select('*');

    const statements = await db('statements')
      .where('content', 'like', searchPattern)
      .select('*');

    const evidence = await db('evidence')
      .join('references', 'evidence.reference_id', '=', 'references.id')
      .where('evidence.content', 'like', searchPattern)
      .select('evidence.*', 'references.title as referenceTitle');

    return { success: true, results: { references, statements, evidence } };
  } catch (e) {
    console.error('Error during universal search:', e);
    return { success: false, error: e.message };
  }
});

// add new IPC handlers above this line
// needed in case process is undefined under Linux
const platform = process.platform || os.platform()

const currentDir = fileURLToPath(new URL('.', import.meta.url))

let mainWindow

async function createWindow() {
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
