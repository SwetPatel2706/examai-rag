def test_app_imports():
    from app.main import app
    assert app.title == "ExamAI API"


def test_config_loading():
    from app.config import settings
    assert settings.APP_ENV in ["local", "staging", "production", "test"]
