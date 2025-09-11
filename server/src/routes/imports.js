async function importAssets(rows, dryRun){
  // NEW: client_code is OPTIONAL. We infer client from location_code when client_code is blank.
  const details = []; let inserted = 0, updated = 0, errors = 0;

  // Preload a map of location_code -> [locations] so we can detect ambiguity
  // (If your dataset is huge you can replace this with a query per row.)
  const allLocs = await Location.find().select('client code').lean();
  const byCode = new Map();
  for (const l of allLocs) {
    const arr = byCode.get(l.code) || [];
    arr.push(l);
    byCode.set(l.code, arr);
  }

  const allowedStatus = ['active','spare','retired','missing'];

  for (let i = 0; i < rows.length; i++) {
    try {
      const r = rows[i];

      const location_code = String(r.location_code || '').trim();
      if (!location_code) throw new Error('location_code required');

      // 1) If client_code provided, validate it; otherwise infer from location_code only.
      let client = null;
      if (r.client_code) {
        client = await Client.findOne({ code: String(r.client_code).toUpperCase() }).lean();
        if (!client) throw new Error('client_code not found');
      }

      // 2) Resolve location:
      //    - If client is known, look up (client, location_code)
      //    - Else, look up by location_code globally. If 0 -> not found; if >1 -> ambiguous.
      let loc = null;
      if (client) {
        loc = await Location.findOne({ client: client._id, code: location_code }).lean();
        if (!loc) throw new Error('location_code not found for client');
      } else {
        const candidates = byCode.get(location_code) || [];
        if (candidates.length === 0) throw new Error(`location_code not found: ${location_code}`);
        if (candidates.length > 1) {
          throw new Error(`ambiguous location_code (exists under multiple clients): ${location_code}`);
        }
        loc = candidates[0];

        // also set client from the location we found
        client = await Client.findById(loc.client).lean();
        if (!client) throw new Error('internal error: location has no client');
      }

      // 3) Build payload, defaulting status to 'active'
      const name = String(r.name || '').trim();
      if (!name) throw new Error('name required');

      const status = allowedStatus.includes(String(r.status || '').toLowerCase())
        ? String(r.status).toLowerCase()
        : 'active';

      const payload = {
        client: client._id,
        location: loc._id,
        name,
        tag: String(r.tag || '').trim(),
        category: String(r.category || '').trim(),
        model: String(r.model || '').trim(),
        serial: String(r.serial || '').trim(),
        status,
        notes: String(r.notes || '').trim()
      };

      if (!dryRun) {
        // Upsert by a conservative key (client, location, name, tag)
        const doc = await Asset.findOneAndUpdate(
          { client: payload.client, location: payload.location, name: payload.name, tag: payload.tag },
          { $set: payload },
          { new: true, upsert: true, setDefaultsOnInsert: true }
        );
        const act = (doc.createdAt.getTime() === doc.updatedAt.getTime()) ? 'insert' : 'update';
        (act === 'insert') ? inserted++ : updated++;
        details.push({ rowIndex: i + 1, ok: true, action: act, message: 'ok' });
      } else {
        details.push({ rowIndex: i + 1, ok: true, action: 'validate', message: 'ok' });
      }
    } catch (e) {
      errors++;
      details.push({ rowIndex: i + 1, ok: false, action: 'error', message: e.message });
    }
  }

  return { rows: details, summary: { inserted, updated, errors, total: rows.length } };
}
