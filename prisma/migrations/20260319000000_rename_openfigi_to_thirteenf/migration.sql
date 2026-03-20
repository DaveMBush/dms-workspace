-- Update existing OPENFIGI values to THIRTEENF
UPDATE "cusip_cache" SET "source" = 'THIRTEENF' WHERE "source" = 'OPENFIGI';
