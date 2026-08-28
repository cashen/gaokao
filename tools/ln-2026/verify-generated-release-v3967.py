#!/usr/bin/env python3
"""Compatibility entry retained for existing CI references.

The single active generated-release verifier is verify-generated-release-v3968.py.
"""
from pathlib import Path
import runpy

runpy.run_path(str(Path(__file__).with_name('verify-generated-release-v3968.py')), run_name='__main__')
