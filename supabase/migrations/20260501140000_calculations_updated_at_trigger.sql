-- Automatisches updated_at bei UPDATE (INSERT nutzt weiterhin DEFAULT now()).
-- Supabase: moddatetime liegt im Schema extensions.

CREATE EXTENSION IF NOT EXISTS moddatetime SCHEMA extensions;

DROP TRIGGER IF EXISTS set_updated_at_calculations ON public.calculations;
DROP TRIGGER IF EXISTS set_updated_at_calculation_positions ON public.calculation_positions;
DROP TRIGGER IF EXISTS set_updated_at_position_library ON public.position_library;
DROP TRIGGER IF EXISTS set_updated_at_trade_categories ON public.trade_categories;
DROP TRIGGER IF EXISTS set_updated_at_offers ON public.offers;
DROP TRIGGER IF EXISTS set_updated_at_offer_templates ON public.offer_templates;
DROP TRIGGER IF EXISTS set_updated_at_project_scope_items ON public.project_scope_items;

CREATE TRIGGER set_updated_at_calculations
  BEFORE UPDATE ON public.calculations
  FOR EACH ROW
  EXECUTE PROCEDURE moddatetime (updated_at);

CREATE TRIGGER set_updated_at_calculation_positions
  BEFORE UPDATE ON public.calculation_positions
  FOR EACH ROW
  EXECUTE PROCEDURE moddatetime (updated_at);

CREATE TRIGGER set_updated_at_position_library
  BEFORE UPDATE ON public.position_library
  FOR EACH ROW
  EXECUTE PROCEDURE moddatetime (updated_at);

CREATE TRIGGER set_updated_at_trade_categories
  BEFORE UPDATE ON public.trade_categories
  FOR EACH ROW
  EXECUTE PROCEDURE moddatetime (updated_at);

CREATE TRIGGER set_updated_at_offers
  BEFORE UPDATE ON public.offers
  FOR EACH ROW
  EXECUTE PROCEDURE moddatetime (updated_at);

CREATE TRIGGER set_updated_at_offer_templates
  BEFORE UPDATE ON public.offer_templates
  FOR EACH ROW
  EXECUTE PROCEDURE moddatetime (updated_at);

CREATE TRIGGER set_updated_at_project_scope_items
  BEFORE UPDATE ON public.project_scope_items
  FOR EACH ROW
  EXECUTE PROCEDURE moddatetime (updated_at);

NOTIFY pgrst, 'reload schema';
