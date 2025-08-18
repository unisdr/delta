CREATE FUNCTION dts_system_info_singleton()
RETURNS trigger AS $$
BEGIN
  IF NEW.id != '73f0defb-4eba-4398-84b3-5e6737fec2b7' THEN
    RAISE EXCEPTION 'Only one row with id = 73f0defb-4eba-4398-84b3-5e6737fec2b7 is allowed';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER dts_system_info_singleton_guard
BEFORE INSERT OR UPDATE ON dts_system_info
FOR EACH ROW EXECUTE FUNCTION dts_system_info_singleton();