FROM nvidia/cuda:12.4.0-devel-ubuntu22.04

ARG PYTHON_VERSION=3.12.3

ENV DEBIAN_FRONTEND=noninteractive
ENV TORCH_HOME="/root/.cache/torch"

RUN apt-get update && \
    apt-get install -y software-properties-common && \
    add-apt-repository ppa:deadsnakes/ppa -y && \
    apt-get update && \
    apt-get install -y \
        python${PYTHON_VERSION%.*} \
        python${PYTHON_VERSION%.*}-dev \
        python3-pip && \
    update-alternatives --install /usr/bin/python3 python3 /usr/bin/python${PYTHON_VERSION%.*} 1 && \
    update-alternatives --set python3 /usr/bin/python${PYTHON_VERSION%.*} && \
    ln -sf /usr/bin/python3 /usr/bin/python && \
    python -m ensurepip && \
    python -m pip install --upgrade pip

RUN apt-get install -y \
    ffmpeg \
    libgl1-mesa-glx \
    wget \
    libcudnn8 \
    libcudnn8-dev && \
    apt-get clean

RUN mkdir -p /user/shar/fonts/truetype/custom && \
    wget -O /user/shar/fonts/truetype/custom/PT_Sans-Caption-Regular.ttf https://github.com/google/fonts/raw/main/ofl/ptsanscaption/PT_Sans-Caption-Web-Regular.ttf && \
    fc-cache -f -v

COPY requirements.txt /app/requirements.txt
WORKDIR /app
RUN pip install -r requirements.txt

COPY ./LR-ASD /LR-ASD
COPY ./models /app/models


CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]