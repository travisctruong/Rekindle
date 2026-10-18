def parse_genres(value: str | None) -> list[str]:
    if not value:
        return []

    value = value.strip()
    if value.startswith("{") and value.endswith("}"):
        value = value[1:-1]

    genres = []
    genre = []
    quoted = False
    element_was_quoted = False
    escaped = False

    def add_genre():
        name = "".join(genre).strip()
        if name and not (not element_was_quoted and name.upper() == "NULL"):
            genres.append(name)
        genre.clear()

    for character in value:
        if escaped:
            genre.append(character)
            escaped = False
        elif character == "\\":
            escaped = True
        elif character == '"':
            quoted = not quoted
            element_was_quoted = True
        elif character == "," and not quoted:
            add_genre()
            element_was_quoted = False
        else:
            genre.append(character)

    if escaped:
        genre.append("\\")
    add_genre()
    return genres
