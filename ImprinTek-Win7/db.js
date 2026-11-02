const fs = require('fs');
const path = require('path');
const initSqlJs = require('sql.js');

let dbInstance = null;
let dbFilePath = null;

const CM_TO_UM = 10000;
const MM_TO_UM = 1000;
const INCH_TO_UM = 25400;

function normalizeKey(str) {
    return (str || '')
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, ' ');
}

function persistDb() {
    if (!dbInstance || !dbFilePath) return;
    try {
        const data = dbInstance.export();
        const buffer = Buffer.from(data);
        fs.writeFileSync(dbFilePath, buffer);
    } catch (err) {
        console.error('Error al persistir la base de datos SQLite:', err);
    }
}

async function initDatabase(userDataPath) {
    if (dbInstance) return dbInstance;

    dbFilePath = path.join(userDataPath || process.cwd(), 'imprintek.sqlite');
    const SQL = await initSqlJs();

    let fileBuffer = null;
    if (fs.existsSync(dbFilePath)) {
        try {
            fileBuffer = fs.readFileSync(dbFilePath);
        } catch (e) {
            console.warn('No se pudo leer imprintek.sqlite existente, se creará uno nuevo:', e.message);
        }
    }

    if (fileBuffer && fileBuffer.length > 0) {
        dbInstance = new SQL.Database(fileBuffer);
    } else {
        dbInstance = new SQL.Database();
    }

    dbInstance.run('PRAGMA foreign_keys = ON;');
    createSchemaAndSeed(dbInstance);
    persistDb();
    return dbInstance;
}

function createSchemaAndSeed(db) {
    db.run(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
            version INTEGER PRIMARY KEY,
            applied_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS measurement_units (
            code TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            numerator_um INTEGER NOT NULL,
            denominator INTEGER NOT NULL,
            precision INTEGER NOT NULL,
            is_active INTEGER NOT NULL DEFAULT 1
        );

        CREATE TABLE IF NOT EXISTS paper_formats (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            normalized_key TEXT NOT NULL UNIQUE,
            is_standard INTEGER NOT NULL DEFAULT 0,
            is_active INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS paper_format_revisions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            paper_format_id INTEGER NOT NULL,
            revision_number INTEGER NOT NULL,
            width_um INTEGER NOT NULL,
            height_um INTEGER NOT NULL,
            display_unit TEXT NOT NULL DEFAULT 'cm',
            created_at TEXT NOT NULL,
            FOREIGN KEY (paper_format_id) REFERENCES paper_formats(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS photo_size_presets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            normalized_key TEXT NOT NULL UNIQUE,
            is_standard INTEGER NOT NULL DEFAULT 0,
            is_active INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS photo_size_preset_revisions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            photo_size_id INTEGER NOT NULL,
            revision_number INTEGER NOT NULL,
            width_um INTEGER NOT NULL,
            height_um INTEGER NOT NULL,
            display_unit TEXT NOT NULL DEFAULT 'cm',
            created_at TEXT NOT NULL,
            FOREIGN KEY (photo_size_id) REFERENCES photo_size_presets(id) ON DELETE CASCADE
        );

        CREATE TRIGGER IF NOT EXISTS protect_standard_paper_formats
        BEFORE DELETE ON paper_formats
        WHEN OLD.is_standard = 1
        BEGIN
            SELECT RAISE(ABORT, 'Los formatos de papel estándar no se pueden eliminar.');
        END;

        CREATE TRIGGER IF NOT EXISTS protect_standard_photo_sizes
        BEFORE DELETE ON photo_size_presets
        WHEN OLD.is_standard = 1
        BEGIN
            SELECT RAISE(ABORT, 'Los tamaños fotográficos estándar no se pueden eliminar.');
        END;

        CREATE TABLE IF NOT EXISTS profiles (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            normalized_key TEXT NOT NULL UNIQUE,
            is_active INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS profile_general_settings (
            profile_id INTEGER PRIMARY KEY,
            paper_format_id INTEGER,
            paper_format_revision_id INTEGER,
            orientation TEXT NOT NULL DEFAULT 'portrait',
            unit TEXT NOT NULL DEFAULT 'cm',
            align TEXT NOT NULL DEFAULT 'mc',
            lines INTEGER NOT NULL DEFAULT 1,
            guide_color TEXT NOT NULL DEFAULT '#ef4444',
            guide_width REAL NOT NULL DEFAULT 1,
            guide_style TEXT NOT NULL DEFAULT 'dashed',
            FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS profile_grid_settings (
            profile_id INTEGER PRIMARY KEY,
            photo_size_id INTEGER,
            photo_size_revision_id INTEGER,
            image_width_cm REAL NOT NULL DEFAULT 3,
            image_height_cm REAL NOT NULL DEFAULT 4,
            image_gap_cm REAL NOT NULL DEFAULT 0.2,
            grid_cols TEXT NOT NULL DEFAULT 'auto',
            grid_rows TEXT NOT NULL DEFAULT 'auto',
            fill_direction TEXT NOT NULL DEFAULT 'row',
            fill INTEGER NOT NULL DEFAULT 0,
            fit_to_page INTEGER NOT NULL DEFAULT 0,
            one_per_page INTEGER NOT NULL DEFAULT 0,
            stretch INTEGER NOT NULL DEFAULT 0,
            FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS profile_free_settings (
            profile_id INTEGER PRIMARY KEY,
            photo_size_id INTEGER,
            photo_size_revision_id INTEGER,
            initial_width_cm REAL NOT NULL DEFAULT 3,
            initial_height_cm REAL NOT NULL DEFAULT 4,
            align TEXT NOT NULL DEFAULT 'mc',
            FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE
        );
    `);

    const paperColumns = db.exec('PRAGMA table_info(paper_formats)');
    if (paperColumns.length && !paperColumns[0].values.some(column => column[1] === 'is_active')) {
        db.run('ALTER TABLE paper_formats ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1');
    }

    // Semillas de unidades
    const unitCount = db.exec("SELECT COUNT(*) as count FROM measurement_units")[0].values[0][0];
    const now = new Date().toISOString();

    if (unitCount === 0) {
        db.run("INSERT INTO measurement_units VALUES ('mm', 'Milímetro', 1000, 1, 1, 1)");
        db.run("INSERT INTO measurement_units VALUES ('cm', 'Centímetro', 10000, 1, 2, 1)");
        db.run("INSERT INTO measurement_units VALUES ('in', 'Pulgada', 25400, 1, 2, 1)");
    }

    // Semillas de papel: Carta, Oficio, A4, A3
    const seedPapers = [
        { name: 'Carta', wCm: 21.59, hCm: 27.94 },
        { name: 'Oficio', wCm: 21.60, hCm: 33.00 },
        { name: 'A4', wCm: 21.00, hCm: 29.70 },
        { name: 'A3', wCm: 29.70, hCm: 42.00 }
    ];
    seedPapers.forEach(paper => {
        const key = normalizeKey(paper.name);
        db.run(
            "INSERT OR IGNORE INTO paper_formats (name, normalized_key, is_standard, is_active, created_at) VALUES (?, ?, 1, 1, ?)",
            [paper.name, key, now]
        );
        const paperId = db.exec("SELECT id FROM paper_formats WHERE normalized_key = ?", [key])[0].values[0][0];
        db.run('UPDATE paper_formats SET is_standard = 1, is_active = 1 WHERE id = ?', [paperId]);
        const revisions = db.exec("SELECT id FROM paper_format_revisions WHERE paper_format_id = ? LIMIT 1", [paperId]);
        if (revisions.length === 0) {
            db.run(
                "INSERT INTO paper_format_revisions (paper_format_id, revision_number, width_um, height_um, display_unit, created_at) VALUES (?, 1, ?, ?, 'cm', ?)",
                [paperId, Math.round(paper.wCm * CM_TO_UM), Math.round(paper.hCm * CM_TO_UM), now]
            );
        }
    });

    // Semillas de tamaños de imagen: Carnet, Pasaporte, Visa, Tarjeta de Presentación, Postal
    const seedPhotos = [
        { name: 'Carnet Clásico (3 x 4 cm)', wCm: 3.0, hCm: 4.0 },
        { name: 'Pasaporte (4 x 4 cm)', wCm: 4.0, hCm: 4.0 },
        { name: 'Visa / Pasaporte Int. (5 x 5 cm)', wCm: 5.0, hCm: 5.0 },
        { name: 'Tarjeta de Presentación (9 x 5 cm)', wCm: 9.0, hCm: 5.0 },
        { name: 'Postal Estándar (10 x 15 cm)', wCm: 10.0, hCm: 15.0 }
    ];
    seedPhotos.forEach(photo => {
        const key = normalizeKey(photo.name);
        db.run(
            "INSERT OR IGNORE INTO photo_size_presets (name, normalized_key, is_standard, is_active, created_at) VALUES (?, ?, 1, 1, ?)",
            [photo.name, key, now]
        );
        const photoId = db.exec("SELECT id FROM photo_size_presets WHERE normalized_key = ?", [key])[0].values[0][0];
        db.run('UPDATE photo_size_presets SET is_standard = 1, is_active = 1 WHERE id = ?', [photoId]);
        const revisions = db.exec("SELECT id FROM photo_size_preset_revisions WHERE photo_size_id = ? LIMIT 1", [photoId]);
        if (revisions.length === 0) {
            db.run(
                "INSERT INTO photo_size_preset_revisions (photo_size_id, revision_number, width_um, height_um, display_unit, created_at) VALUES (?, 1, ?, ?, 'cm', ?)",
                [photoId, Math.round(photo.wCm * CM_TO_UM), Math.round(photo.hCm * CM_TO_UM), now]
            );
        }
    });
}

// MÉTODOS DE CONSULTA Y OPERACIÓN

function queryAll(sql, params = []) {
    const stmt = dbInstance.prepare(sql);
    if (params.length > 0) stmt.bind(params);
    const results = [];
    while (stmt.step()) {
        results.push(stmt.getAsObject());
    }
    stmt.free();
    return results;
}

function getPaperFormats() {
    const sql = `
        SELECT pf.id, pf.name, pf.normalized_key, pf.is_standard,
               pfr.id AS revision_id, pfr.revision_number,
               pfr.width_um, pfr.height_um, pfr.display_unit,
               ROUND(pfr.width_um / 10000.0, 2) AS width_cm,
               ROUND(pfr.height_um / 10000.0, 2) AS height_cm
        FROM paper_formats pf
        JOIN paper_format_revisions pfr ON pfr.paper_format_id = pf.id
        WHERE pf.is_active = 1 AND pfr.revision_number = (
            SELECT MAX(revision_number) FROM paper_format_revisions WHERE paper_format_id = pf.id
        )
        ORDER BY pf.is_standard DESC, pf.name ASC;
    `;
    return queryAll(sql);
}

function savePaperFormat({ name, widthCm, heightCm, unit = 'cm' }) {
    if (!name || !name.trim()) throw new Error('El nombre del formato de papel no puede estar vacío.');
    const trimmedName = name.trim();
    const key = normalizeKey(trimmedName);
    const wNum = parseFloat(widthCm);
    const hNum = parseFloat(heightCm);
    if (isNaN(wNum) || wNum <= 0 || isNaN(hNum) || hNum <= 0) {
        throw new Error('Las medidas deben ser números mayores a cero.');
    }

    const wUm = Math.round(wNum * CM_TO_UM);
    const hUm = Math.round(hNum * CM_TO_UM);
    const now = new Date().toISOString();

    const existing = queryAll("SELECT id FROM paper_formats WHERE normalized_key = ?", [key]);
    let paperId;

    if (existing.length > 0) {
        paperId = existing[0].id;
        dbInstance.run('UPDATE paper_formats SET name = ?, is_active = 1 WHERE id = ?', [trimmedName, paperId]);
        const revRows = queryAll("SELECT MAX(revision_number) as max_rev FROM paper_format_revisions WHERE paper_format_id = ?", [paperId]);
        const nextRev = (revRows[0]?.max_rev || 0) + 1;
        dbInstance.run(
            "INSERT INTO paper_format_revisions (paper_format_id, revision_number, width_um, height_um, display_unit, created_at) VALUES (?, ?, ?, ?, ?, ?)",
            [paperId, nextRev, wUm, hUm, unit, now]
        );
    } else {
        dbInstance.run(
            "INSERT INTO paper_formats (name, normalized_key, is_standard, created_at) VALUES (?, ?, 0, ?)",
            [trimmedName, key, now]
        );
        paperId = dbInstance.exec("SELECT last_insert_rowid()")[0].values[0][0];
        dbInstance.run(
            "INSERT INTO paper_format_revisions (paper_format_id, revision_number, width_um, height_um, display_unit, created_at) VALUES (?, 1, ?, ?, ?, ?)",
            [paperId, wUm, hUm, unit, now]
        );
    }

    persistDb();
    return getPaperFormats().find(p => p.id === paperId);
}

function deletePaperFormat(paperId) {
    const paper = queryAll('SELECT id, is_standard FROM paper_formats WHERE id = ?', [Number(paperId)])[0];
    if (!paper) throw new Error('No se encontró el formato de papel.');
    if (paper.is_standard) throw new Error('Los formatos de papel estándar no se pueden eliminar.');
    dbInstance.run('UPDATE paper_formats SET is_active = 0 WHERE id = ?', [paper.id]);
    persistDb();
    return { success: true };
}

function getPhotoSizes() {
    const sql = `
        SELECT psp.id, psp.name, psp.normalized_key, psp.is_standard, psp.is_active,
               pspr.id AS revision_id, pspr.revision_number,
               pspr.width_um, pspr.height_um, pspr.display_unit,
               ROUND(pspr.width_um / 10000.0, 2) AS width_cm,
               ROUND(pspr.height_um / 10000.0, 2) AS height_cm
        FROM photo_size_presets psp
        JOIN photo_size_preset_revisions pspr ON pspr.photo_size_id = psp.id
        WHERE psp.is_active = 1 AND pspr.revision_number = (
            SELECT MAX(revision_number) FROM photo_size_preset_revisions WHERE photo_size_id = psp.id
        )
        ORDER BY psp.is_standard DESC, psp.name ASC;
    `;
    return queryAll(sql);
}

function savePhotoSize({ name, widthCm, heightCm, unit = 'cm' }) {
    if (!name || !name.trim()) throw new Error('El nombre de la medida de foto no puede estar vacío.');
    const trimmedName = name.trim();
    const key = normalizeKey(trimmedName);
    const wNum = parseFloat(widthCm);
    const hNum = parseFloat(heightCm);
    if (isNaN(wNum) || wNum <= 0 || isNaN(hNum) || hNum <= 0) {
        throw new Error('Las dimensiones deben ser números mayores a cero.');
    }

    const wUm = Math.round(wNum * CM_TO_UM);
    const hUm = Math.round(hNum * CM_TO_UM);
    const now = new Date().toISOString();

    const existing = queryAll("SELECT id FROM photo_size_presets WHERE normalized_key = ?", [key]);
    let photoId;

    if (existing.length > 0) {
        photoId = existing[0].id;
        const revRows = queryAll("SELECT MAX(revision_number) as max_rev FROM photo_size_preset_revisions WHERE photo_size_id = ?", [photoId]);
        const nextRev = (revRows[0]?.max_rev || 0) + 1;
        dbInstance.run(
            "INSERT INTO photo_size_preset_revisions (photo_size_id, revision_number, width_um, height_um, display_unit, created_at) VALUES (?, ?, ?, ?, ?, ?)",
            [photoId, nextRev, wUm, hUm, unit, now]
        );
        dbInstance.run("UPDATE photo_size_presets SET is_active = 1 WHERE id = ?", [photoId]);
    } else {
        dbInstance.run(
            "INSERT INTO photo_size_presets (name, normalized_key, is_standard, is_active, created_at) VALUES (?, ?, 0, 1, ?)",
            [trimmedName, key, now]
        );
        photoId = dbInstance.exec("SELECT last_insert_rowid()")[0].values[0][0];
        dbInstance.run(
            "INSERT INTO photo_size_preset_revisions (photo_size_id, revision_number, width_um, height_um, display_unit, created_at) VALUES (?, 1, ?, ?, ?, ?)",
            [photoId, wUm, hUm, unit, now]
        );
    }

    persistDb();
    return getPhotoSizes().find(p => p.id === photoId);
}

function deletePhotoSize(photoId) {
    const photo = queryAll('SELECT id, is_standard FROM photo_size_presets WHERE id = ?', [Number(photoId)])[0];
    if (!photo) throw new Error('No se encontró la medida fotográfica.');
    if (photo.is_standard) throw new Error('Los tamaños fotográficos estándar no se pueden eliminar.');
    dbInstance.run('UPDATE photo_size_presets SET is_active = 0 WHERE id = ?', [photo.id]);
    persistDb();
    return { success: true };
}

function getProfiles() {
    const profiles = queryAll(`
        SELECT p.id, p.name, p.normalized_key, p.created_at, p.updated_at,
               pgs.paper_format_id, pgs.paper_format_revision_id, pgs.orientation, pgs.unit, pgs.align,
               pgs.lines, pgs.guide_color, pgs.guide_width, pgs.guide_style,
               pgrid.photo_size_id, pgrid.photo_size_revision_id, pgrid.image_width_cm, pgrid.image_height_cm,
               pgrid.image_gap_cm, pgrid.grid_cols, pgrid.grid_rows, pgrid.fill_direction,
               pgrid.fill, pgrid.fit_to_page, pgrid.one_per_page, pgrid.stretch,
               pfree.initial_width_cm, pfree.initial_height_cm
        FROM profiles p
        LEFT JOIN profile_general_settings pgs ON pgs.profile_id = p.id
        LEFT JOIN profile_grid_settings pgrid ON pgrid.profile_id = p.id
        LEFT JOIN profile_free_settings pfree ON pfree.profile_id = p.id
        WHERE p.is_active = 1
        ORDER BY p.name ASC;
    `);
    return profiles;
}

function saveProfile(profileData) {
    const { name, general = {}, grid = {}, free = {} } = profileData;
    if (!name || !name.trim()) throw new Error('El nombre de la configuración/perfil es obligatorio.');
    const trimmedName = name.trim();
    const key = normalizeKey(trimmedName);
    const now = new Date().toISOString();

    const existing = queryAll("SELECT id FROM profiles WHERE normalized_key = ?", [key]);
    let profileId;

    if (existing.length > 0) {
        profileId = existing[0].id;
        dbInstance.run("UPDATE profiles SET name = ?, updated_at = ?, is_active = 1 WHERE id = ?", [trimmedName, now, profileId]);
        dbInstance.run("DELETE FROM profile_general_settings WHERE profile_id = ?", [profileId]);
        dbInstance.run("DELETE FROM profile_grid_settings WHERE profile_id = ?", [profileId]);
        dbInstance.run("DELETE FROM profile_free_settings WHERE profile_id = ?", [profileId]);
    } else {
        dbInstance.run(
            "INSERT INTO profiles (name, normalized_key, is_active, created_at, updated_at) VALUES (?, ?, 1, ?, ?)",
            [trimmedName, key, now, now]
        );
        profileId = dbInstance.exec("SELECT last_insert_rowid()")[0].values[0][0];
    }

    // Insert general settings
    dbInstance.run(`
        INSERT INTO profile_general_settings (
            profile_id, paper_format_id, paper_format_revision_id, orientation, unit, align, lines, guide_color, guide_width, guide_style
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
        profileId,
        general.paperFormatId || null,
        general.paperFormatRevisionId || null,
        general.orientation || 'portrait',
        general.unit || 'cm',
        general.align || 'mc',
        general.lines ? 1 : 0,
        general.guideColor || '#ef4444',
        general.guideWidth || 1,
        general.guideStyle || 'dashed'
    ]);

    // Insert grid settings
    dbInstance.run(`
        INSERT INTO profile_grid_settings (
            profile_id, photo_size_id, photo_size_revision_id, image_width_cm, image_height_cm, image_gap_cm,
            grid_cols, grid_rows, fill_direction, fill, fit_to_page, one_per_page, stretch
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
        profileId,
        grid.photoSizeId || null,
        grid.photoSizeRevisionId || null,
        parseFloat(grid.imageWidthCm) || 3,
        parseFloat(grid.imageHeightCm) || 4,
        parseFloat(grid.imageGapCm) || 0.2,
        grid.gridCols || 'auto',
        grid.gridRows || 'auto',
        grid.fillDirection || 'row',
        grid.fill ? 1 : 0,
        grid.fitToPage ? 1 : 0,
        grid.onePerPage ? 1 : 0,
        grid.stretch ? 1 : 0
    ]);

    // Insert free settings
    dbInstance.run(`
        INSERT INTO profile_free_settings (
            profile_id, photo_size_id, photo_size_revision_id, initial_width_cm, initial_height_cm, align
        ) VALUES (?, ?, ?, ?, ?, ?)
    `, [
        profileId,
        free.photoSizeId || null,
        free.photoSizeRevisionId || null,
        parseFloat(free.initialWidthCm) || 3,
        parseFloat(free.initialHeightCm) || 4,
        free.align || 'mc'
    ]);

    persistDb();
    return getProfiles().find(p => p.id === profileId);
}

function deleteProfile(profileId) {
    dbInstance.run("UPDATE profiles SET is_active = 0 WHERE id = ?", [profileId]);
    persistDb();
    return { success: true };
}

module.exports = {
    initDatabase,
    getPaperFormats,
    savePaperFormat,
    deletePaperFormat,
    getPhotoSizes,
    savePhotoSize,
    deletePhotoSize,
    getProfiles,
    saveProfile,
    deleteProfile
};
