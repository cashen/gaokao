#!/usr/bin/env python3
"""Compatibility entry retained for existing CI references.

The single active final-release verifier is verify-final-release-v3969.py.
"""
from pathlib import Path
import runpy

runpy.run_path(str(Path(__file__).with_name('verify-final-release-v3969.py')), run_name='__main__')
