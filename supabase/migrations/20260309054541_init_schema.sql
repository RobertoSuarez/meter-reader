CREATE TABLE public.meters (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users NOT NULL,
    name text NOT NULL,
    billing_day integer NOT NULL DEFAULT 13,
    created_at timestamptz DEFAULT now()
);

ALTER TABLE public.meters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own meters."
    ON public.meters FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own meters."
    ON public.meters FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own meters."
    ON public.meters FOR UPDATE
    USING (auth.uid() = user_id);

CREATE TABLE public.readings (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    meter_id uuid REFERENCES public.meters ON DELETE CASCADE NOT NULL,
    reading_date timestamptz NOT NULL,
    kw_value numeric NOT NULL,
    image_url text,
    created_at timestamptz DEFAULT now()
);

ALTER TABLE public.readings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert readings for their own meters."
    ON public.readings FOR INSERT
    WITH CHECK (EXISTS (SELECT 1 FROM public.meters WHERE id = meter_id AND user_id = auth.uid()));

CREATE POLICY "Users can view readings for their own meters."
    ON public.readings FOR SELECT
    USING (EXISTS (SELECT 1 FROM public.meters WHERE id = meter_id AND user_id = auth.uid()));

-- Settings / Configuration for Rates
CREATE TABLE public.tariff_ranges (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    range_min integer NOT NULL,
    range_max integer, -- null for infinity
    rate numeric NOT NULL
);

-- Seed defaults for Quevedo (Costa)
INSERT INTO public.tariff_ranges (range_min, range_max, rate) VALUES
(0, 130, 0.04),
(131, 500, 0.095),
(501, 700, 0.125),
(701, NULL, 0.16);
