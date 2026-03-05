
-- Create Students table
CREATE TABLE IF NOT EXISTS students (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  total NUMERIC DEFAULT 2000,
  paid NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create Installments table (payments)
CREATE TABLE IF NOT EXISTS installments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create Receipts table
CREATE TABLE IF NOT EXISTS receipts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create Expenses table
CREATE TABLE IF NOT EXISTS expenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  provider TEXT NOT NULL,
  service TEXT DEFAULT 'Outros',
  total NUMERIC NOT NULL,
  paid NUMERIC NOT NULL,
  date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create Events table
CREATE TABLE IF NOT EXISTS events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  date DATE NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create Config table
CREATE TABLE IF NOT EXISTS config (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL
);

-- Initial Config
INSERT INTO config (key, value) VALUES ('general', '{"targetAmount": 80000, "perStudent": 2000}') ON CONFLICT (key) DO NOTHING;

-- Enable Row Level Security (RLS)
-- For now, let's keep it simple for development, but we should eventually add policies
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE installments ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE config ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (for development - BE CAREFUL IN PRODUCTION)
DROP POLICY IF EXISTS "Public Read/Write" ON students;
CREATE POLICY "Public Read/Write" ON students FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public Read/Write" ON installments;
CREATE POLICY "Public Read/Write" ON installments FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public Read/Write" ON receipts;
CREATE POLICY "Public Read/Write" ON receipts FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public Read/Write" ON expenses;
CREATE POLICY "Public Read/Write" ON expenses FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public Read/Write" ON events;
CREATE POLICY "Public Read/Write" ON events FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public Read/Write" ON config;
CREATE POLICY "Public Read/Write" ON config FOR ALL USING (true) WITH CHECK (true);

-- Storage Policies (for Bucket "comprovantes")
DROP POLICY IF EXISTS "Acesso Publico Upload" ON storage.objects;
CREATE POLICY "Acesso Publico Upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'comprovantes');

DROP POLICY IF EXISTS "Acesso Publico Ver" ON storage.objects;
CREATE POLICY "Acesso Publico Ver" ON storage.objects FOR SELECT USING (bucket_id = 'comprovantes');

DROP POLICY IF EXISTS "Acesso Publico Deletar" ON storage.objects;
CREATE POLICY "Acesso Publico Deletar" ON storage.objects FOR DELETE USING (bucket_id = 'comprovantes');

DROP POLICY IF EXISTS "Acesso Publico Atualizar" ON storage.objects;
CREATE POLICY "Acesso Publico Atualizar" ON storage.objects FOR UPDATE WITH CHECK (bucket_id = 'comprovantes');

