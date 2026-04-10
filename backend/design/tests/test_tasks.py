# Python imports
import os
import tempfile
from unittest.mock import patch

# App imports
from design.tasks import delete_output_folder


def test_delete_output_folder_success():
    """Test successful deletion of a folder."""
    tmpdir = tempfile.mkdtemp()
    assert os.path.exists(tmpdir)

    with patch("design.tasks.Logger") as mock_logger:
        delete_output_folder(tmpdir)

    assert not os.path.exists(tmpdir)
    mock_logger.info.assert_called_once()


def test_delete_output_folder_not_exists():
    """Test when the folder does not exist."""
    fake_path = "/tmp/non_existent_folder_12345"

    with patch("design.tasks.Logger") as mock_logger:
        delete_output_folder(fake_path)

    mock_logger.warning.assert_called_once()


def test_delete_output_folder_is_file():
    """Test when the path exists but is a file, not a directory."""
    with tempfile.NamedTemporaryFile(delete=False) as tmp:
        file_path = tmp.name

    try:
        assert os.path.exists(file_path)
        with patch("design.tasks.Logger") as mock_logger:
            delete_output_folder(file_path)

        assert os.path.exists(file_path)
        mock_logger.warning.assert_called_once()
    finally:
        if os.path.exists(file_path):
            os.remove(file_path)
