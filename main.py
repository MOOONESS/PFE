from fastapi import FastAPI, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import engine, Base, get_db
import models
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional
from sqlalchemy import text
from fastapi.security import OAuth2PasswordRequestForm

import auth


app = FastAPI()

# Add CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Adjust according to your frontend's address
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create database tables
Base.metadata.create_all(bind=engine)

# 🚀 Schema Definitions

class DriverSchema(BaseModel):
    id: int
    username: str

    class Config:
        from_attributes = True

# User Schema for login (Generalized for all roles)
class UserLogin(BaseModel):
    username: str
    password: str

# # Citizen Schema
# class CitizenCreate(BaseModel):
#     name: str
#     username: str
#     password: str

# Complaint Response Schema
class ComplaintResponse(BaseModel):
    id: int
    description: str
    citizen_id: int
    status: str
    latitude: float  # New latitude field
    longitude: float  # New longitude field

    class Config:
        orm_mode = True

# Complaint Create Schema
class ComplaintCreate(BaseModel):
    description: str
    citizen_id: int
    latitude: float  # New latitude field
    longitude: float  # New longitude field

class CitizenResponse(BaseModel):
    id: int
    name: str
    username: str
    complaints: List[int]  
    class Config:
        orm_mode = True
# Driver Schema
class DriverCreate(BaseModel):
    username: str
    password: str

class TruckBase(BaseModel):
    id:int
    driver_id: int
    status: str
    longitude: float
    latitude: float

    class Config:
        orm_mode = True  # Tells Pydantic to treat SQLAlchemy models as dictionaries
        from_attributes = True  # This explicitly allows using `from_orm()`

class Truck(BaseModel):
    id: int
    driver_id: int
    status: str
    longitude: float
    latitude: float
    # Add other fields here

    class Config:
        orm_mode = True  # This allows the conversion from ORM to Pydantic model
        from_attributes = True  # This explicitly allows using `from_orm()`

class TruckCreate(TruckBase):
    pass

class TruckUpdate(TruckBase):
    status: Optional[str] = None  # Optional for updates


# Admin Schema
class AdminCreate(BaseModel):
    username: str
    password: str

# 🚀 Helper Functions

def get_user_from_db(db: Session, username: str, password: str, role: str):
    # Check user based on the role
    if role == "citizen":
        user = db.query(models.Citizen).filter(models.Citizen.username == username).first()
    elif role == "driver":
        user = db.query(models.Driver).filter(models.Driver.username == username).first()
    elif role == "admin":
        user = db.query(models.Admin).filter(models.Admin.username == username).first()
    else:
        raise HTTPException(status_code=404, detail="Role not found")

    if not user or user.password != password:  # Replace with hashed password comparison in production!
        raise HTTPException(status_code=401, detail="Invalid credentials")

    return user

class CitizenRegisterRequest(BaseModel):
    name: str
    username: str
    password: str

@app.post("/register")
def register_citizen(request: CitizenRegisterRequest, db: Session = Depends(get_db)):
    existing_user = db.query(models.Citizen).filter(models.Citizen.username == request.username).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Username already taken")

    hashed_password = auth.hash_password(request.password)
    new_citizen = models.Citizen(
        username=request.username, 
        password=hashed_password, 
        name=request.name
    )
    
    db.add(new_citizen)
    db.commit()
    db.refresh(new_citizen)
    
    return {"message": "Citizen account created successfully"}

@app.post("/token")
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user, role = auth.get_user_by_username(db, form_data.username)
    
    if user is None or not auth.verify_password(form_data.password, user.password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    
    # Add the 'id' and 'role' along with the 'access_token'
    token_data = {"sub": user.username, "role": role, "id": user.id}  # Add ID and Role to the token data
    access_token = auth.create_access_token(token_data)
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "id": user.id,      # Return user ID
        "role": role        # Return user role
    }



@app.post("/create_driver")
def create_driver(username: str, password: str, admin: models.Admin = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    if not isinstance(admin, models.Admin):
        raise HTTPException(status_code=403, detail="Only admin can create drivers")

    hashed_password = auth.hash_password(password)
    new_driver = models.Driver(username=username, password=hashed_password)

    db.add(new_driver)
    db.commit()
    db.refresh(new_driver)

    return {"message": "Driver created successfully"}



@app.get("/trucks/", response_model=List[Truck])
def get_all_trucks(db: Session = Depends(get_db)):
    # Query all trucks
    trucks = db.query(models.Truck).all()

    # If no trucks are found, raise a 404 error
    if not trucks:
        raise HTTPException(status_code=404, detail="No trucks found")

    # Return the list of trucks, ensuring to return them as dictionaries
    return [Truck.from_orm(truck) for truck in trucks]  # This will convert SQLAlchemy objects to Pydantic models


@app.get("/trucks/{driver_id}", response_model=Truck)
def get_truck_by_driver_id(driver_id: int, db: Session = Depends(get_db)):
    # Query the truck by the given driver_id
    truck = db.query(models.Truck).filter(models.Truck.driver_id == driver_id).first()

    # If the truck with the given driver_id doesn't exist, raise a 404 error
    if truck is None:
        raise HTTPException(status_code=404, detail="Truck not found")
    return truck


@app.get("/citizens", response_model=List[CitizenResponse])
def get_citizens(db: Session = Depends(get_db)):
    try:
        query = text("""
            SELECT id, name, username, 
            FROM citizens
        """)
        
        result = db.execute(query)
        
        citizens = [{
            "id": row.id,
            "name": row.name,
            "username": row.username,

            "complaints": []  # You can populate complaints if needed, for now it's an empty list
        } for row in result]

        if not citizens:
            raise HTTPException(status_code=404, detail="No citizens found")

        return citizens

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
## Complaint Routes
@app.post("/complaints/", response_model=ComplaintResponse)
def create_complaint(complaint: ComplaintCreate, db: Session = Depends(get_db)):
    # Create a new complaint using latitude and longitude
    db_complaint = models.Complaint(
        description=complaint.description,
        citizen_id=complaint.citizen_id,
        latitude=complaint.latitude,  # Use latitude
        longitude=complaint.longitude   # Use longitude
    )
    db.add(db_complaint)
    db.commit()
    db.refresh(db_complaint)
    return db_complaint

@app.get("/complaints/{citizen_id}", response_model=List[ComplaintResponse])
def get_complaints_by_citizen(citizen_id: int, db: Session = Depends(get_db)):
    try:
        # Update the query to select latitude and longitude directly
        query = text("""
            SELECT id, description, 
                   latitude, 
                   longitude, 
                   citizen_id, 
                   status
            FROM complaints
            WHERE citizen_id = :citizen_id
        """)
        
        result = db.execute(query, {"citizen_id": citizen_id})
        complaints = [{
            "id": row.id,
            "description": row.description,
            "latitude": row.latitude,
            "longitude": row.longitude,
            "citizen_id": row.citizen_id,
            "status": row.status
        } for row in result]
        
        # Log the complaints to debug
        print(complaints)

        if not complaints:
            raise HTTPException(status_code=404, detail="No complaints found for this citizen")

        return complaints

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# @app.get("/complaints/", response_model=List[ComplaintResponse])
# def get_complaints(db: Session = Depends(get_db)):
#     try:
#         query = text("""
#             SELECT id, description, latitude, longitude, citizen_id, status
#             FROM complaints
#         """)

#         result = db.execute(query)
#         complaints = [{
#             "id": row.id,
#             "description": row.description,
#             "latitude": row.latitude,
#             "longitude": row.longitude,
#             "citizen_id": row.citizen_id,
#             "status": row.status
#         } for row in result]

#         if not complaints:
#             raise HTTPException(status_code=404, detail="No complaints found")

#         return complaints

#     except Exception as e:
#         raise HTTPException(status_code=500, detail=str(e))



DATABASE_URL = "postgresql://postgres:13644107@localhost/waste"

import asyncio
import json
import asyncpg
import datetime
from fastapi import Request
from sse_starlette.sse import EventSourceResponse


# Serialize datetime objects to ISO strings
def serialize_row(row):
    serialized = {}
    for key, value in row.items():
        if isinstance(value, (datetime.datetime, datetime.date)):
            serialized[key] = value.isoformat()
        else:
            serialized[key] = value
    return serialized

@app.get("/complaints/")
async def stream_complaints(request: Request):
    queue = asyncio.Queue()

    async def pg_listener(connection, pid, channel, payload):
        await queue.put(payload)

    async def event_generator():
        conn = await asyncpg.connect(DATABASE_URL)
        await conn.add_listener("complaints_channel", pg_listener)

        # 🔥 Send initial complaints
        rows = await conn.fetch("SELECT * FROM complaints")
        complaints = [serialize_row(dict(row)) for row in rows]
        yield {
            "event": "initial",
            "data": json.dumps(complaints)
        }

        try:
            while True:
                if await request.is_disconnected():
                    break

                try:
                    # Wait for NOTIFY signal
                    await asyncio.wait_for(queue.get(), timeout=30.0)
                    rows = await conn.fetch("SELECT * FROM complaints")
                    complaints = [serialize_row(dict(row)) for row in rows]

                    yield {
                        "event": "update",
                        "data": json.dumps(complaints)
                    }

                except asyncio.TimeoutError:
                    # Keep-alive ping
                    yield {"event": "ping", "data": "keep-alive"}

        finally:
            await conn.remove_listener("complaints_channel", pg_listener)
            await conn.close()

    return EventSourceResponse(event_generator())




@app.get("/drivers/")
def get_drivers(db: Session = Depends(get_db)):
    return db.query(models.Driver).all()



## Admin Routes
@app.post("/admins/")
def create_admin(admin: AdminCreate, db: Session = Depends(get_db)):
    db_admin = models.Admin(name=admin.name, password=admin.password)
    db.add(db_admin)
    db.commit()
    db.refresh(db_admin)
    return db_admin

@app.get("/admins/")
def get_admins(db: Session = Depends(get_db)):
    return db.query(models.Admin).all()

# 🚀 Dashboard Routes
@app.get("/admin_dashboard")
def admin_dashboard(db: Session = Depends(get_db)):
    return {"message": "Welcome to the Admin Dashboard!"}


from fastapi.security import OAuth2PasswordBearer

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

def get_current_user(token: str = Depends(oauth2_scheme)):
    payload = auth.decode_access_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")
    return payload  # Returns {"sub": username, "role": "driver", "id": driver_id}

@app.get("/citizen/dashboard", response_model= int)  # Change response model
def get_citizen_dashboard(current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user["role"] != "citizen":
        raise HTTPException(status_code=403, detail="Not authorized")

    citizen_id = current_user["id"]  # Extract citizen ID from token

    return citizen_id # Return as JSON object

@app.get("/citizens/{citizen_id}", response_model=CitizenResponse)
def get_citizen(citizen_id: int, db: Session = Depends(get_db)):
    try:
        query = text("""
            SELECT id, name, username
            FROM citizens
            WHERE id = :citizen_id
        """)
        
        result = db.execute(query, {"citizen_id": citizen_id}).fetchone()

        if not result:
            raise HTTPException(status_code=404, detail="Citizen not found")

        citizen = {
            "id": result.id,
            "name": result.name,
            "username": result.username,
            "complaints": []  # Optional, add complaints if needed
        }

        return citizen

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))



@app.get("/driver/dashboard", response_model= int)
def get_driver_dashboard(current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user["role"] != "driver":
        raise HTTPException(status_code=403, detail="Not authorized")

    driver_id = current_user["id"]  # Extract driver ID from token
    
    return driver_id  # Return only complaints assigned to this driver




@app.put("/assign_complaint/{complaint_id}/{driver_id}")
def assign_complaint_to_driver(complaint_id: int, driver_id: int, db: Session = Depends(get_db)):
    # Check if the complaint exists
    complaint = db.query(models.Complaint).filter(models.Complaint.id == complaint_id).first()
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")

    # Check if the driver exists
    driver = db.query(models.Driver).filter(models.Driver.id == driver_id).first()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found")

    # Check if the driver has a truck assigned
    truck = db.query(models.Truck).filter(models.Truck.driver_id == driver_id).first()
    if not truck:
        raise HTTPException(status_code=400, detail="Driver has no assigned truck")

    # Assign the complaint to the truck
    complaint.assigned_truck_id = truck.id
    complaint.driver_id = driver_id

    # Update the complaint status to "in progress"
    complaint.status = "In progress"
    
    # Commit the changes to the database
    db.commit()
    db.refresh(complaint)

    return {"message": "Complaint assigned successfully", "complaint_id": complaint.id, "truck_id": truck.id}



@app.get("/complaints/assigned/{driver_id}", response_model=List[ComplaintResponse])
def get_assigned_complaints(driver_id: int, db: Session = Depends(get_db)):
    try:
        query = text("""
            SELECT id, description, latitude, longitude, citizen_id, status
            FROM complaints
            WHERE driver_id = :driver_id
        """)

        result = db.execute(query, {"driver_id": driver_id})
        complaints = [{
            "id": row.id,
            "description": row.description,
            "latitude": row.latitude,
            "longitude": row.longitude,
            "citizen_id": row.citizen_id,
            "status": row.status
        } for row in result]

        if not complaints:
            raise HTTPException(status_code=404, detail="No assigned complaints found for this driver")

        return complaints

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class StatusUpdate(BaseModel):
    status: str

@app.put("/complaints/{complaint_id}/status")
def update_complaint_status(complaint_id: int, status_update: StatusUpdate, db: Session = Depends(get_db)):
    complaint = db.query(models.Complaint).filter(models.Complaint.id == complaint_id).first()
    
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")
    
    complaint.status = status_update.status
    db.commit()
    db.refresh(complaint)
    
    return {"message": "Complaint status updated successfully", "complaint": complaint}

class NotificationCreate(BaseModel):
    message: str
    recipient: str

@app.post("/notifications")
def create_notification(notification: NotificationCreate, db: Session = Depends(get_db)):
    new_notification = models.Notification(
        message=notification.message,
        recipient=notification.recipient
    )
    
    db.add(new_notification)
    db.commit()
    db.refresh(new_notification)
    
    return {"message": "Notification sent successfully", "notification": new_notification}


@app.get("/notifications")
def get_notifications(db: Session = Depends(get_db)):
    notifications = db.query(models.Notification).order_by(models.Notification.created_at.desc()).all()
    return notifications