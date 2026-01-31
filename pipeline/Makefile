SHELL := /bin/bash

PIPELINE_DIR := $(abspath $(dir $(lastword $(MAKEFILE_LIST))))
ROOT := $(abspath $(PIPELINE_DIR)/..)
PYTHON ?= python3

DATA_ROOT ?= $(ROOT)
CONFIG ?= $(ROOT)/config/branch_definitions.json

PHOENIX_ACCOUNTS ?= $(ROOT)/Uploads/Phoenix\ Account\ List\ 10\ 29.csv
TUCSON_ACCOUNTS ?= $(ROOT)/Uploads/Tucson\ CG\ Active\ List.csv
ANALYSIS_WORKBOOK ?= $(ROOT)/Uploads/SJ\ Proposed\ Phoenix\ Branch\ Analysis\ By\ Zip\ Code\ (1).xlsx
ANALYSIS_SHEET ?= \#3 - Analysis by Zip Code

PHOENIX_WORKBOOK ?= $(ROOT)/Phoenix_3Branch_Final_Consolidation.xlsx
PHOENIX_ACCOUNTS_XLSX ?= $(ROOT)/Uploads/Residential\ Data\ for\ Phoenix.xlsx
TUCSON_MAPPING ?= $(ROOT)/tucson_account_mapping.csv

PIPELINE_OUTPUT_DIR ?= $(ROOT)/pipeline_outputs
MASTER_OUTPUT_DIR ?= $(PIPELINE_OUTPUT_DIR)/master_assignments
OPTIMIZE_OUTPUT_DIR ?= $(PIPELINE_OUTPUT_DIR)/optimization

.PHONY: help pipeline ingest transform export verify check-inputs master-assignments optimize-territories

help:
	@echo "Pipeline automation targets:"
	@echo "  make -f pipeline/Makefile pipeline    # ingest → transform → export → verify"
	@echo "  make -f pipeline/Makefile ingest      # verify input files exist"
	@echo "  make -f pipeline/Makefile transform   # create master assignments"
	@echo "  make -f pipeline/Makefile export      # optimize Phoenix/Tucson territories"
	@echo "  make -f pipeline/Makefile verify      # syntax checks for retained scripts"
	@echo ""
	@echo "Override paths with VAR=value, e.g.:"
	@echo "  make -f pipeline/Makefile pipeline DATA_ROOT=/path/to/data"

pipeline: ingest transform export verify

ingest: check-inputs

transform: master-assignments

export: optimize-territories

check-inputs:
	@test -f "$(PHOENIX_ACCOUNTS)" || (echo "Missing Phoenix accounts CSV: $(PHOENIX_ACCOUNTS)" && exit 1)
	@test -f "$(TUCSON_ACCOUNTS)" || (echo "Missing Tucson accounts CSV: $(TUCSON_ACCOUNTS)" && exit 1)
	@test -f "$(ANALYSIS_WORKBOOK)" || (echo "Missing analysis workbook: $(ANALYSIS_WORKBOOK)" && exit 1)
	@test -f "$(PHOENIX_WORKBOOK)" || (echo "Missing Phoenix consolidation workbook: $(PHOENIX_WORKBOOK)" && exit 1)
	@test -f "$(PHOENIX_ACCOUNTS_XLSX)" || (echo "Missing Phoenix accounts XLSX: $(PHOENIX_ACCOUNTS_XLSX)" && exit 1)
	@test -f "$(TUCSON_MAPPING)" || (echo "Missing Tucson mapping CSV: $(TUCSON_MAPPING)" && exit 1)

master-assignments:
	@mkdir -p "$(MASTER_OUTPUT_DIR)"
	$(PYTHON) "$(ROOT)/create_master_assignments.py" \
		--data-root "$(DATA_ROOT)" \
		--config "$(CONFIG)" \
		--phoenix-workbook "$(PHOENIX_WORKBOOK)" \
		--phoenix-accounts "$(PHOENIX_ACCOUNTS_XLSX)" \
		--tucson-accounts "$(TUCSON_ACCOUNTS)" \
		--tucson-mapping "$(TUCSON_MAPPING)" \
		--output-dir "$(MASTER_OUTPUT_DIR)"

optimize-territories:
	@mkdir -p "$(OPTIMIZE_OUTPUT_DIR)"
	$(PYTHON) "$(ROOT)/phoenix_territory_optimization/optimize_territories.py" \
		--data-root "$(DATA_ROOT)" \
		--config "$(CONFIG)" \
		--phoenix-accounts "$(PHOENIX_ACCOUNTS)" \
		--tucson-accounts "$(TUCSON_ACCOUNTS)" \
		--analysis-workbook "$(ANALYSIS_WORKBOOK)" \
		--analysis-sheet "$(ANALYSIS_SHEET)" \
		--output-dir "$(OPTIMIZE_OUTPUT_DIR)"

verify:
	$(PYTHON) -m py_compile \
		"$(ROOT)/create_master_assignments.py" \
		"$(ROOT)/phoenix_territory_optimization/optimize_territories.py"
