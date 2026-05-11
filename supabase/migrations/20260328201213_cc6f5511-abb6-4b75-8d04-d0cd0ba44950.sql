
-- B3: Server-side validation trigger for orders
CREATE OR REPLACE FUNCTION public.validate_order()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path TO 'public'
AS $$
BEGIN
  IF TRIM(COALESCE(NEW.client_name, '')) = '' THEN
    RAISE EXCEPTION 'client_name cannot be empty';
  END IF;
  IF LENGTH(TRIM(COALESCE(NEW.client_phone, ''))) < 10 THEN
    RAISE EXCEPTION 'client_phone must be at least 10 characters';
  END IF;
  IF TRIM(COALESCE(NEW.wilaya, '')) = '' THEN
    RAISE EXCEPTION 'wilaya cannot be empty';
  END IF;
  IF TRIM(COALESCE(NEW.address, '')) = '' THEN
    RAISE EXCEPTION 'address cannot be empty';
  END IF;
  IF NEW.total <= 0 THEN
    RAISE EXCEPTION 'total must be positive';
  END IF;
  IF NEW.subtotal <= 0 THEN
    RAISE EXCEPTION 'subtotal must be positive';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_order_before_insert
  BEFORE INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_order();
