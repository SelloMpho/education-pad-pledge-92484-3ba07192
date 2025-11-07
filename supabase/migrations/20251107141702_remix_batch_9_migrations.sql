
-- Migration: 20251029041342
-- Create profiles table with verification status
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  phone TEXT,
  user_type TEXT NOT NULL CHECK (user_type IN ('institution', 'investor', 'admin')),
  verification_status TEXT NOT NULL DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create institutions table
CREATE TABLE public.institutions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  institution_name TEXT NOT NULL,
  country TEXT NOT NULL,
  city TEXT NOT NULL,
  address TEXT NOT NULL,
  contact_person TEXT NOT NULL,
  contact_position TEXT,
  certificate_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Create investors table
CREATE TABLE public.investors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  investor_type TEXT NOT NULL CHECK (investor_type IN ('individual', 'corporate', 'foundation', 'ngo')),
  company_name TEXT,
  certificate_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Create conversations table
CREATE TABLE public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  investor_id UUID NOT NULL REFERENCES public.investors(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(institution_id, investor_id)
);

-- Create messages table
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.institutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Institutions policies
CREATE POLICY "Users can view their own institution"
  ON public.institutions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own institution"
  ON public.institutions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own institution"
  ON public.institutions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Verified investors can view institutions"
  ON public.institutions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() 
        AND p.user_type = 'investor' 
        AND p.verification_status = 'verified'
    )
  );

-- Investors policies
CREATE POLICY "Users can view their own investor profile"
  ON public.investors FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own investor profile"
  ON public.investors FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own investor profile"
  ON public.investors FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Verified institutions can view investors"
  ON public.investors FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() 
        AND p.user_type = 'institution' 
        AND p.verification_status = 'verified'
    )
  );

-- Create helper functions for conversation access
CREATE OR REPLACE FUNCTION public.is_institution_in_conversation(conv_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.conversations c
    JOIN public.institutions i ON c.institution_id = i.id
    JOIN public.profiles p ON i.user_id = p.id
    WHERE c.id = conv_id 
      AND p.id = auth.uid() 
      AND p.verification_status = 'verified'
  );
$$ LANGUAGE SQL SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.is_investor_in_conversation(conv_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.conversations c
    JOIN public.investors inv ON c.investor_id = inv.id
    JOIN public.profiles p ON inv.user_id = p.id
    WHERE c.id = conv_id 
      AND p.id = auth.uid() 
      AND p.verification_status = 'verified'
  );
$$ LANGUAGE SQL SECURITY DEFINER SET search_path = public;

-- Conversations policies (only verified users can access)
CREATE POLICY "Verified users can view their conversations"
  ON public.conversations FOR SELECT
  USING (
    public.is_institution_in_conversation(id) OR public.is_investor_in_conversation(id)
  );

CREATE POLICY "Verified users can create conversations"
  ON public.conversations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM public.profiles p1
      JOIN public.institutions i ON p1.id = i.user_id
      CROSS JOIN public.profiles p2
      JOIN public.investors inv ON p2.id = inv.user_id
      WHERE i.id = institution_id 
        AND inv.id = investor_id
        AND p1.verification_status = 'verified'
        AND p2.verification_status = 'verified'
        AND (p1.id = auth.uid() OR p2.id = auth.uid())
    )
  );

-- Messages policies (only verified conversation participants)
CREATE POLICY "Verified users can view messages in their conversations"
  ON public.messages FOR SELECT
  USING (
    public.is_institution_in_conversation(conversation_id) OR public.is_investor_in_conversation(conversation_id)
  );

CREATE POLICY "Verified users can send messages in their conversations"
  ON public.messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND (public.is_institution_in_conversation(conversation_id) OR public.is_investor_in_conversation(conversation_id))
  );

CREATE POLICY "Users can update read status on messages"
  ON public.messages FOR UPDATE
  USING (
    public.is_institution_in_conversation(conversation_id) OR public.is_investor_in_conversation(conversation_id)
  );

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- Create function to update conversation updated_at
CREATE OR REPLACE FUNCTION public.update_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.conversations
  SET updated_at = NOW()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to update conversation timestamp on new message
CREATE TRIGGER update_conversation_timestamp_trigger
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.update_conversation_timestamp();

-- Create function to update profiles updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for profiles updated_at
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Migration: 20251029041453
-- Fix search_path for update_updated_at_column function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Migration: 20251029042542
-- Create an enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'institution', 'investor');

-- Create the user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS Policies for user_roles table
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert roles"
ON public.user_roles
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update roles"
ON public.user_roles
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete roles"
ON public.user_roles
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- Migration: 20251031080420
-- Create storage bucket for certificates
INSERT INTO storage.buckets (id, name, public)
VALUES ('certificates', 'certificates', false);

-- Allow authenticated users to upload their own certificates
CREATE POLICY "Users can upload their own certificates"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'certificates' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to view their own certificates
CREATE POLICY "Users can view their own certificates"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'certificates' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to update their own certificates
CREATE POLICY "Users can update their own certificates"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'certificates' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to delete their own certificates
CREATE POLICY "Users can delete their own certificates"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'certificates' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Migration: 20251101054734
-- Add RLS policies for admin to view all profiles, institutions, and investors

-- Admin can view all profiles
CREATE POLICY "Admins can view all profiles" ON public.profiles
FOR SELECT USING (has_role(auth.uid(), 'admin'));

-- Admin can update all profiles
CREATE POLICY "Admins can update all profiles" ON public.profiles
FOR UPDATE USING (has_role(auth.uid(), 'admin'));

-- Admin can view all institutions
CREATE POLICY "Admins can view all institutions" ON public.institutions
FOR SELECT USING (has_role(auth.uid(), 'admin'));

-- Admin can update all institutions
CREATE POLICY "Admins can update all institutions" ON public.institutions
FOR UPDATE USING (has_role(auth.uid(), 'admin'));

-- Admin can view all investors
CREATE POLICY "Admins can view all investors" ON public.investors
FOR SELECT USING (has_role(auth.uid(), 'admin'));

-- Admin can update all investors
CREATE POLICY "Admins can update all investors" ON public.investors
FOR UPDATE USING (has_role(auth.uid(), 'admin'));

-- Migration: 20251103111027
-- Create donations table
CREATE TABLE IF NOT EXISTS public.donations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  investor_id uuid NOT NULL REFERENCES public.investors(id) ON DELETE CASCADE,
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  amount numeric NOT NULL CHECK (amount > 0),
  currency text NOT NULL DEFAULT 'USD',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled', 'failed')),
  donation_date timestamp with time zone NOT NULL DEFAULT now(),
  message text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.donations ENABLE ROW LEVEL SECURITY;

-- Admins can view all donations
CREATE POLICY "Admins can view all donations"
ON public.donations
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Admins can update all donations
CREATE POLICY "Admins can update all donations"
ON public.donations
FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

-- Admins can insert donations
CREATE POLICY "Admins can insert donations"
ON public.donations
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Admins can delete donations
CREATE POLICY "Admins can delete donations"
ON public.donations
FOR DELETE
USING (has_role(auth.uid(), 'admin'));

-- Investors can view their own donations
CREATE POLICY "Investors can view their own donations"
ON public.donations
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.investors inv
    WHERE inv.id = donations.investor_id
    AND inv.user_id = auth.uid()
  )
);

-- Institutions can view donations to them
CREATE POLICY "Institutions can view their donations"
ON public.donations
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.institutions inst
    WHERE inst.id = donations.institution_id
    AND inst.user_id = auth.uid()
  )
);

-- Investors can create donations
CREATE POLICY "Investors can create donations"
ON public.donations
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.investors inv
    WHERE inv.id = donations.investor_id
    AND inv.user_id = auth.uid()
  )
);

-- Create trigger for updated_at
CREATE TRIGGER update_donations_updated_at
BEFORE UPDATE ON public.donations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Migration: 20251103112443
-- Allow admins to view all certificates
CREATE POLICY "Admins can view all certificates"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'certificates' 
  AND has_role(auth.uid(), 'admin')
);

-- Migration: 20251104093917
-- Allow admins to download certificates (needed for createSignedUrl)
CREATE POLICY "Admins can download all certificates"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'certificates' 
  AND has_role(auth.uid(), 'admin')
);

-- Migration: 20251104095530
-- Enable realtime for profiles table
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
