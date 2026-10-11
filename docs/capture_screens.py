import subprocess
import os
import time

urls = [
    ("01_landing.png", "http://localhost:5173/"),
    ("02_login.png", "http://localhost:5173/login"),
    ("03_register.png", "http://localhost:5173/register"),
    ("04_ai_question_generator.png", "http://localhost:5173/ai-question-generator"),
    ("05_dashboard.png", "http://localhost:5173/dashboard"),
    ("06_resume_analyzer.png", "http://localhost:5173/resume"),
    ("07_mock_interview.png", "http://localhost:5173/interview"),
    ("08_quiz_practice.png", "http://localhost:5173/quiz"),
    ("09_career_roles.png", "http://localhost:5173/career-roles"),
    ("10_admin_portal.png", "http://localhost:5173/admin"),
]

edge_exe = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
if not os.path.exists(edge_exe):
    edge_exe = r"C:\Program Files\Google\Chrome\Application\chrome.exe"

out_dir = r"c:\Users\acer\Videos\placement preparation ai\docs\screenshots"
os.makedirs(out_dir, exist_ok=True)
temp_dir = os.environ.get("TEMP", r"C:\Temp")

for filename, url in urls:
    temp_target = os.path.join(temp_dir, f"temp_{filename}")
    final_target = os.path.join(out_dir, filename)
    cmd = [
        edge_exe,
        "--headless",
        "--disable-gpu",
        "--hide-scrollbars",
        "--window-size=1280,820",
        f"--screenshot={temp_target}",
        url
    ]
    try:
        subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=15)
        if os.path.exists(temp_target):
            import shutil
            shutil.copyfile(temp_target, final_target)
            print(f"Captured: {filename} ({os.path.getsize(final_target)} bytes)")
        else:
            print(f"Failed to generate: {filename}")
    except Exception as e:
        print(f"Error {filename}: {e}")

print("Screenshot capture complete!")
