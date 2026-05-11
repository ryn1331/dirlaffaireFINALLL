
-- Create the sequence if it doesn't exist
CREATE SEQUENCE IF NOT EXISTS order_number_seq START 1;

-- Attach the trigger to the orders table
CREATE OR REPLACE TRIGGER set_order_number
  BEFORE INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_order_number();
