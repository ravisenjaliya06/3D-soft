G21 ; Set units to millimeters
G90 ; Use absolute coordinates
G28 ; Home all axes
F1000 ; Set feed rate
G0 X0 Y0 ; Move to start
G1 Z-3 F100 ; Plunge
G1 X1214.0 Y0 ; Line 1
G1 X1214.0 Y1964.0 ; Line 2
G1 X0 Y1964.0 ; Line 3
G1 X0 Y0 ; Line 4
G0 Z5 ; Lift cutter
G28 ; Home
M30 ; End program