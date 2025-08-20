class EmailData:
    sender_email: str
    sender_password: str
    receiver_email: str
    subject: str
    html: str

    def __init__(
        self: "EmailData",
        sender_email: str,
        sender_password: str,
        receiver_email: str,
        subject: str,
        html: str,
    ) -> None:
        self.sender_email = sender_email
        self.sender_password = sender_password
        self.receiver_email = receiver_email
        self.subject = subject
        self.html = html
