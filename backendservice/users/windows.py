# # services/windows.py
# import csv
# from datetime import timedelta
# from django.utils import timezone

# from backendservice.users.models import SessionWindow

# LINES_PER_FRAME = 32
# COLS = 32

# def generate_windows_for_upload(upload, *, batch_size=1000, high_pressure_threshold=60):
#     fps = int(upload.fps or 14)
#     frames_per_full_window = fps  # 1 second
#     t0 = upload.recorded_at or timezone.now()

#     windows = []
#     window_index = 0

#     lines_in_frame = 0
#     frames_in_window = 0
#     current_max = None

#     def flush_window(frames_count: int):
#         nonlocal window_index, frames_in_window, current_max, windows
#         if frames_count <= 0:
#             return

#         start = t0 + timedelta(seconds=window_index)  # index-based timeline
#         end = start + timedelta(seconds=frames_count / fps)

#         ppi_raw = current_max if current_max is not None else 1
#         windows.append(
#             SessionWindow(
#                 upload=upload,
#                 window_index=window_index,
#                 window_start_time=start,
#                 window_end_time=end,
#                 ppi_raw=ppi_raw,
#                 is_high_pressure=(ppi_raw > high_pressure_threshold),
#                 contact_area_pct=0.0,
#                 risk_score_contribution=0.0,
#             )
#         )
#         window_index += 1
#         frames_in_window = 0
#         current_max = None

#         if len(windows) >= batch_size:
#             SessionWindow.objects.bulk_create(windows, batch_size=batch_size)
#             windows.clear()

#     upload.file.open("r")
#     try:
#         reader = csv.reader(upload.file)
#         for row in reader:
#             if not row:
#                 continue
#             if len(row) != COLS:
#                 raise ValueError(f"Expected {COLS} columns, got {len(row)}")

#             # update running max
#             for s in row:
#                 v = int(s)
#                 if current_max is None or v > current_max:
#                     current_max = v

#             lines_in_frame += 1
#             if lines_in_frame == LINES_PER_FRAME:
#                 lines_in_frame = 0
#                 frames_in_window += 1

#                 if frames_in_window == frames_per_full_window:
#                     flush_window(frames_in_window)

        
#         flush_window(frames_in_window)

#         if windows:
#             SessionWindow.objects.bulk_create(windows, batch_size=batch_size)

#     finally:
#         upload.file.close()
