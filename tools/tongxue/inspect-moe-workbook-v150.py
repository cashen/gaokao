#!/usr/bin/env python3
from __future__ import annotations
import json
import sys
import xlrd

path=sys.argv[1]
book=xlrd.open_workbook(path)
for sheet in book.sheets():
    preview=[]
    for row_index in range(min(sheet.nrows,18)):
        row=[]
        for col_index in range(min(sheet.ncols,8)):
            value=sheet.cell_value(row_index,col_index)
            if isinstance(value,float) and value.is_integer(): value=int(value)
            row.append(str(value).strip())
        preview.append(row)
    print('MOE_SHEET_INSPECT '+json.dumps({'name':sheet.name,'rows':sheet.nrows,'cols':sheet.ncols,'preview':preview},ensure_ascii=False))
