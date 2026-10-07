  const totalSales = transactions.filter((t:any) => t.status !== 'CANCELLED').reduce((s:number,t:any)=>s+Number(t.selling_price),0);
  const totalPaid = payments.filter((p:any) => p.transaction_id !== null).reduce((s:number,p:any)=>s+Number(p.amount),0);
  const loanRows = (await pool.query(`SELECT la.*, COALESCE((SELECT SUM(a.amount) FROM loan_advance_adjustments a WHERE a.loan_advance_id=la.id AND a.reversed_at IS NULL),0) AS applied_amount
    FROM loan_advances la WHERE la.party_type='customer' AND la.party_id=$1 AND la.reversed_at IS NULL ORDER BY la.occurred_at DESC`, [customerId])).rows;
  const loanAdvanceReceived = loanRows.filter((r:any)=>r.direction==='received').reduce((s:number,r:any)=>s+Number(r.amount),0);
  const loanAdvanceGiven = loanRows.filter((r:any)=>r.direction==='given').reduce((s:number,r:any)=>s+Number(r.amount),0);
  const loanAdvanceApplied = loanRows.reduce((s:number,r:any)=>s+Number(r.applied_amount||0),0);
  const availableAdvanceReceived = Math.max(0, loanRows.filter((r:any)=>r.direction==='received').reduce((s:number,r:any)=>s+Math.max(0,Number(r.amount)-Number(r.applied_amount||0)),0));
  const invoiceDue = Number(customer.opening_due || 0) + totalSales - totalPaid;
  const currentDue = Math.max(0, invoiceDue + loanAdvanceGiven - availableAdvanceReceived);
  res.json({ customer, totalSales, totalPaid, invoiceDue, currentDue, loanAdvanceReceived, loanAdvanceGiven, loanAdvanceApplied, availableAdvance: availableAdvanceReceived, transactions, payments, loanAdvances: loanRows });
});

app.post('/api/vendors', auth, async (req,res) => {
  try {
    const name=String(req.body?.name||'').trim();
    if(!name) return res.status(400).json({error:'Vendor name is required'});
    const {rows}=await pool.query(`INSERT INTO vendors (name,company,mobile,whatsapp,email,address,account_info,opening_payable) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,[name,req.body?.company||null,req.body?.mobile||null,req.body?.whatsapp||null,req.body?.email||null,req.body?.address||null,req.body?.accountInfo||null,Number(req.body?.openingPayable||0)]);
    await audit(pool as any, req.session.userId!, 'VENDOR_CREATED', 'Vendor', rows[0].id, null, rows[0]);
    res.status(201).json({vendor:rows[0]});
  } catch(e){res.status(400).json({error:e instanceof Error?e.message:'Vendor creation failed'});}
});
 
app.get('/api/vendors', auth, async (req, res) => {
  const q = String(req.query.q || '').trim();
  const { rows } = await pool.query(q ? 'SELECT * FROM vendors WHERE name ILIKE $1 ORDER BY name LIMIT 30' : 'SELECT * FROM vendors ORDER BY name LIMIT 100', q ? [q + '%'] : []);
  res.json(rows);
});

app.patch('/api/customers/:id', auth, async (req,res) => {
  try {
    const { rows } = await pool.query(
      'UPDATE customers SET name=COALESCE($1,name), mobile=COALESCE($2,mobile), email=COALESCE($3,email), address=COALESCE($4,address), whatsapp=COALESCE($5,whatsapp), nid=COALESCE($6,nid), passport_number=COALESCE($7,passport_number), passport_expiry=COALESCE($8,passport_expiry), notes=COALESCE($9,notes), opening_due=COALESCE($10,opening_due), updated_at=now() WHERE id=$11 RETURNING *',
      [req.body?.name,req.body?.mobile,req.body?.email,req.body?.address,req.body?.whatsapp,req.body?.nid,req.body?.passportNumber,req.body?.passportExpiry,req.body?.notes,req.body?.openingDue,req.params.id]
    );
    if(!rows[0]) return res.status(404).json({error:'Customer not found'});
    res.json({customer:rows[0]});
  } catch(e) { res.status(400).json({error:e instanceof Error?e.message:'Customer update failed'}); }
});

app.get('/api/vendors/:id/ledger', auth, async (req, res) => {
  const vendorId = req.params.id;
  const vendor = (await pool.query('SELECT * FROM vendors WHERE id=$1', [vendorId])).rows[0];
  if (!vendor) return res.status(404).json({ error: 'Vendor not found' });
  const transactions = (await pool.query('SELECT * FROM transactions WHERE vendor_id=$1 AND deleted_at IS NULL ORDER BY date DESC, time DESC, created_at DESC', [vendorId])).rows;
  const payments = (await pool.query("SELECT p.*, t.invoice_number, (p.paid_at AT TIME ZONE 'Asia/Dhaka')::date::text AS paid_date, to_char(p.paid_at AT TIME ZONE 'Asia/Dhaka','HH24:MI') AS paid_time FROM payments p LEFT JOIN transactions t ON t.id=p.transaction_id WHERE p.entity_id=$1 AND p.payment_type='vendor' AND p.reversed_at IS NULL AND (p.transaction_id IS NULL OR t.deleted_at IS NULL) ORDER BY p.paid_at DESC", [vendorId])).rows;
  const totalCost = transactions.filter((t:any) => t.status !== 'CANCELLED').reduce((s:number,t:any)=>s+Number(t.vendor_cost),0);
  const totalPaid = payments.filter((p:any) => p.transaction_id !== null).reduce((s:number,p:any)=>s+Number(p.amount),0);
  const loanRows = (await pool.query(`SELECT la.*, COALESCE((SELECT SUM(a.amount) FROM loan_advance_adjustments a WHERE a.loan_advance_id=la.id AND a.reversed_at IS NULL),0) AS applied_amount
    FROM loan_advances la WHERE la.party_type='vendor' AND la.party_id=$1 AND la.reversed_at IS NULL ORDER BY la.occurred_at DESC`, [vendorId])).rows;
  const loanAdvanceReceived = loanRows.filter((r:any)=>r.direction==='received').reduce((s:number,r:any)=>s+Number(r.amount),0);
  const loanAdvanceGiven = loanRows.filter((r:any)=>r.direction==='given').reduce((s:number,r:any)=>s+Number(r.amount),0);
  const loanAdvanceApplied = loanRows.reduce((s:number,r:any)=>s+Number(r.applied_amount||0),0);
  const availableAdvanceGiven = Math.max(0, loanRows.filter((r:any)=>r.direction==='given').reduce((s:number,r:any)=>s+Math.max(0,Number(r.amount)-Number(r.applied_amount||0)),0));
  const invoicePayable = Number(vendor.opening_payable || 0) + totalCost - totalPaid;
  const vendorReceivable = Math.max(0, availableAdvanceGiven - invoicePayable);
  const currentPayable = Math.max(0, invoicePayable - availableAdvanceGiven + loanAdvanceReceived);
  res.json({ vendor, totalCost, totalPaid, invoicePayable, currentPayable, vendorReceivable, loanAdvanceReceived, loanAdvanceGiven, loanAdvanceApplied, availableAdvance: availableAdvanceGiven, transactions, payments, loanAdvances: loanRows });
});

app.patch('/api/vendors/:id', auth, async (req,res) => {
  try {
    const { rows } = await pool.query(
      'UPDATE vendors SET name=COALESCE($1,name), company=COALESCE($2,company), mobile=COALESCE($3,mobile), whatsapp=COALESCE($4,whatsapp), email=COALESCE($5,email), address=COALESCE($6,address), account_info=COALESCE($7,account_info), opening_payable=COALESCE($8,opening_payable), updated_at=now() WHERE id=$9 RETURNING *',
      [req.body?.name,req.body?.company,req.body?.mobile,req.body?.whatsapp,req.body?.email,req.body?.address,req.body?.accountInfo,req.body?.openingPayable,req.params.id]
    );
    if(!rows[0]) return res.status(404).json({error:'Vendor not found'});
    res.json({vendor:rows[0]});
  } catch(e) { res.status(400).json({error:e instanceof Error?e.message:'Vendor update failed'}); }
});
