-- 1. Students table
CREATE TABLE IF NOT EXISTS students (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  total NUMERIC DEFAULT 2000,
  paid NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Installments table (payments)
CREATE TABLE IF NOT EXISTS installments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Receipts table
CREATE TABLE IF NOT EXISTS receipts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Expenses table
CREATE TABLE IF NOT EXISTS expenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  provider TEXT NOT NULL,
  service TEXT DEFAULT 'Outros',
  total NUMERIC NOT NULL,
  paid NUMERIC NOT NULL,
  date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Events table
CREATE TABLE IF NOT EXISTS events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  date DATE NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Config table
CREATE TABLE IF NOT EXISTS config (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL
);

-- Initial Config
INSERT INTO config (key, value) VALUES ('general', '{"targetAmount": 80000, "perStudent": 2000}') ON CONFLICT (key) DO NOTHING;

-- --- SECURITY & HARDENING ---

ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE installments ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE config ENABLE ROW LEVEL SECURITY;

-- Granular RLS Policies (Disabled public DELETE)
CREATE POLICY "Public Read" ON students FOR SELECT USING (true);
CREATE POLICY "Public Insert" ON students FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update" ON students FOR UPDATE USING (true);

CREATE POLICY "Public Read" ON installments FOR SELECT USING (true);
CREATE POLICY "Public Insert" ON installments FOR INSERT WITH CHECK (true);

CREATE POLICY "Public Read" ON receipts FOR SELECT USING (true);
CREATE POLICY "Public Insert" ON receipts FOR INSERT WITH CHECK (true);

CREATE POLICY "Public Read" ON expenses FOR SELECT USING (true);
CREATE POLICY "Public Insert" ON expenses FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update" ON expenses FOR UPDATE USING (true);

-- --- AUTOMATION TRIGGERS ---

-- Auto-update student paid amount and status
CREATE OR REPLACE FUNCTION update_student_paid_on_installment()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
        UPDATE students 
        SET paid = (SELECT COALESCE(SUM(amount), 0) FROM installments WHERE student_id = NEW.student_id),
            status = CASE 
                WHEN (SELECT COALESCE(SUM(amount), 0) FROM installments WHERE student_id = NEW.student_id) >= total THEN 'paid'
                ELSE 'pending'
            END
        WHERE id = NEW.student_id;
    ELSIF (TG_OP = 'DELETE') THEN
        UPDATE students 
        SET paid = (SELECT COALESCE(SUM(amount), 0) FROM installments WHERE student_id = OLD.student_id),
            status = CASE 
                WHEN (SELECT COALESCE(SUM(amount), 0) FROM installments WHERE student_id = OLD.student_id) >= total THEN 'paid'
                ELSE 'pending'
            END
        WHERE id = OLD.student_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_paid
AFTER INSERT OR UPDATE OR DELETE ON installments
FOR EACH ROW EXECUTE FUNCTION update_student_paid_on_installment();

-- --- STORAGE POLICIES ---

-- Restricted Upload (Images & PDF Only)
CREATE POLICY "Public Upload Filtered" ON storage.objects 
FOR INSERT WITH CHECK (
    bucket_id = 'comprovantes' AND (
        lower(storage.extension(name)) = 'jpg' OR 
        lower(storage.extension(name)) = 'png' OR 
        lower(storage.extension(name)) = 'jpeg' OR 
        lower(storage.extension(name)) = 'pdf'
    )
);

CREATE POLICY "Public Read Storage" ON storage.objects FOR SELECT USING (bucket_id = 'comprovantes');

-- --- ADMIN AUTHENTICATION (INTERNAL) ---

CREATE TABLE IF NOT EXISTS internal_auth (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Note: Password for initial admin is 'Terceira0!2026'
-- To change, use: UPDATE internal_auth SET password_hash = crypt('NEW_PASS', gen_salt('bf')) WHERE username = 'admin@terceirao2026.com';
INSERT INTO internal_auth (username, password_hash)
VALUES ('admin@terceirao2026.com', crypt('Terceira0!2026', gen_salt('bf')))
ON CONFLICT (username) DO NOTHING;

ALTER TABLE internal_auth ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Internal Access Only" ON internal_auth FOR ALL USING (false);

-- RPC for secure login verification
CREATE OR REPLACE FUNCTION verify_admin_login(p_username TEXT, p_password TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    v_match BOOLEAN;
BEGIN
    SELECT (password_hash = crypt(p_password, password_hash))
    INTO v_match
    FROM internal_auth
    WHERE username = p_username;
    
    RETURN COALESCE(v_match, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

